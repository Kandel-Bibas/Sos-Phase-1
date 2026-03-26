"""
AWS Lambda handler for CLaRa Legal Chatbot queries.
This is for OpenSearch Managed (not Serverless).

Phase 2 upgrade:
- Hybrid search (kNN + BM25 + Reciprocal Rank Fusion) replaces kNN-only
- Orchestrator routing for multi-agent intent handling
- State/agency filtering support
- Multi-turn conversation history
- Structured metadata in response (comparison tables, frequency data, etc.)

For the full orchestrated API, use backend.agents.lambdas.orchestrator_handler.
This file maintains backward compatibility with the Phase 1 API contract
while adding hybrid search and new parameters.
"""

import json
import os
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

# Environment variables
OPENSEARCH_ENDPOINT = os.environ['OPENSEARCH_ENDPOINT']
OPENSEARCH_INDEX = os.environ.get('OPENSEARCH_INDEX', 'ms-legal-abstracts')
BEDROCK_MODEL_ID = os.environ['BEDROCK_MODEL_ID']
BEDROCK_EMBEDDING_MODEL_ID = os.environ['BEDROCK_EMBEDDING_MODEL_ID']
AWS_REGION = os.environ['AWS_REGION']

# Initialize clients
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(
    credentials.access_key,
    credentials.secret_key,
    AWS_REGION,
    'es',  # 'es' for OpenSearch Managed (NOT 'aoss')
    session_token=credentials.token
)

host = OPENSEARCH_ENDPOINT.replace('https://', '').replace('http://', '')
opensearch_client = OpenSearch(
    hosts=[{'host': host, 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=30
)

bedrock_client = boto3.client(
    service_name='bedrock-runtime',
    region_name=AWS_REGION
)

# System prompt — expanded for multi-state research
SYSTEM_PROMPT = """You are a legal research assistant for the Mississippi Secretary of State's office.
Your role is to help staff verify if regulations comply with statutes across multiple states.

CRITICAL REQUIREMENTS:
1. You MUST cite specific statutory authority for EVERY claim you make.
2. Citations must include: document name, section identifier (if available), and page numbers.
3. If you cannot find statutory authority for a question, clearly state this limitation.
4. Never make claims without supporting evidence from the provided legal texts.
5. When comparing across states, clearly attribute each provision to its state."""


def get_embedding(text: str) -> list[float]:
    """Generate embedding using Bedrock Titan."""
    body = json.dumps({"inputText": text, "dimensions": 1024, "normalize": True})

    response = bedrock_client.invoke_model(
        modelId=BEDROCK_EMBEDDING_MODEL_ID,
        body=body,
        contentType='application/json',
        accept='application/json'
    )

    response_body = json.loads(response['body'].read())
    return response_body['embedding']


def search_abstracts(
    query: str,
    top_k: int = 5,
    filter_state: str | None = None,
    filter_agency_type: str | None = None,
    filter_states: list[str] | None = None,
) -> list[dict]:
    """
    Hybrid search: kNN + BM25 + Reciprocal Rank Fusion.

    Phase 2 upgrade from kNN-only search. Supports state/agency filtering.
    """
    query_embedding = get_embedding(query)
    candidate_pool = top_k * 3

    # Build filter clauses
    filters = []
    if filter_state:
        filters.append({"term": {"state": filter_state}})
    if filter_agency_type:
        filters.append({"term": {"agency_type": filter_agency_type}})
    if filter_states:
        filters.append({"terms": {"state": filter_states}})

    # Phase 1: kNN semantic search
    knn_query = {
        "size": candidate_pool,
        "query": {
            "knn": {
                "embedding_vector": {
                    "vector": query_embedding,
                    "k": candidate_pool
                }
            }
        }
    }
    if filters:
        knn_query["query"] = {
            "bool": {
                "must": [knn_query["query"]],
                "filter": filters
            }
        }

    knn_response = opensearch_client.search(index=OPENSEARCH_INDEX, body=knn_query)
    knn_hits = knn_response['hits']['hits']

    # Phase 2: BM25 keyword search
    bm25_query = {
        "size": candidate_pool,
        "query": {
            "bool": {
                "should": [
                    {"match": {"statute_codes": {"query": query, "boost": 4.0}}},
                    {"match": {"statutory_authority_references": {"query": query, "boost": 3.5}}},
                    {"match": {"section_identifier": {"query": query, "boost": 3.0}}},
                    {"match": {"abstract_text": {"query": query, "boost": 2.0}}},
                    {"match": {"core_rule": {"query": query, "boost": 2.0}}},
                    {"match": {"original_text": {"query": query, "boost": 1.5}}},
                    {"match": {"compliance_requirements": {"query": query, "boost": 1.5}}},
                    {"match": {"legal_entities": {"query": query, "boost": 1.0}}},
                ],
                "minimum_should_match": 1
            }
        }
    }
    if filters:
        bm25_query["query"]["bool"]["filter"] = filters

    bm25_response = opensearch_client.search(index=OPENSEARCH_INDEX, body=bm25_query)
    bm25_hits = bm25_response['hits']['hits']

    # Phase 3: Reciprocal Rank Fusion
    rrf_k = 60
    scores: dict[str, dict] = {}

    for rank, hit in enumerate(knn_hits):
        doc_id = hit['_id']
        scores[doc_id] = {
            'rrf_score': 1.0 / (rrf_k + rank + 1),
            'source': hit['_source'],
        }

    for rank, hit in enumerate(bm25_hits):
        doc_id = hit['_id']
        increment = 1.0 / (rrf_k + rank + 1)
        if doc_id in scores:
            scores[doc_id]['rrf_score'] += increment
        else:
            scores[doc_id] = {'rrf_score': increment, 'source': hit['_source']}

    ranked = sorted(scores.items(), key=lambda x: x[1]['rrf_score'], reverse=True)

    results = []
    for doc_id, data in ranked[:top_k]:
        src = data['source']
        results.append({
            'abstract_text': src.get('abstract_text', ''),
            'core_rule': src.get('core_rule', ''),
            'source_document': src.get('source_document', ''),
            'page_numbers': src.get('page_numbers', []),
            'section_identifier': src.get('section_identifier'),
            'statute_codes': src.get('statute_codes', []),
            'original_text': (src.get('original_text') or '')[:2000],
            'score': data['rrf_score'],
            'state': src.get('state', 'MS'),
            'agency_type': src.get('agency_type', ''),
        })

    return results


def format_context(results: list[dict]) -> str:
    """Format search results into context for LLM."""
    if not results:
        return "No relevant legal documents found for this query."

    context_parts = []
    for result in results:
        pages = ", ".join(str(p) for p in result['page_numbers'])
        section = result['section_identifier'] or 'N/A'
        state = result.get('state', 'MS')

        context_parts.append(f"""
---
STATE: {state}
SOURCE: {result['source_document']} (Section: {section}, Pages: {pages})
RELEVANCE SCORE: {result['score']:.4f}
STATUTE CODES: {', '.join(result['statute_codes']) if result['statute_codes'] else 'None identified'}

SUMMARY: {result['abstract_text']}

CORE RULE: {result['core_rule']}

ORIGINAL TEXT (for precise citation):
{result['original_text']}
---""")

    return "\n".join(context_parts)


def call_bedrock_llm(user_message: str, history: list[dict] | None = None) -> str:
    """
    Call Bedrock LLM via Converse API (model-agnostic).

    Phase 2 upgrade: uses the Converse API for model-agnostic calling
    and supports conversation history for multi-turn.
    """
    messages = []
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": [{"text": user_message}]})

    response = bedrock_client.converse(
        modelId=BEDROCK_MODEL_ID,
        system=[{"text": SYSTEM_PROMPT}],
        messages=messages,
        inferenceConfig={
            "maxTokens": 4096,
            "temperature": 0.1,
            "topP": 0.9,
        },
    )

    return response['output']['message']['content'][0]['text']


def lambda_handler(event, context):
    """
    Main Lambda handler.

    Phase 2 additions:
    - 'filters' parameter for state/agency filtering
    - 'history' parameter for multi-turn conversation
    - 'mode' parameter for research/compare/count modes
    - Response includes 'intent' and 'metadata' fields
    """
    try:
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                },
                'body': ''
            }

        # Parse request
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event

        query = body.get('query', '')
        if not query:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Query parameter is required'})
            }

        # Phase 2: extract new parameters
        filters = body.get('filters', {})
        history = body.get('history')
        mode = body.get('mode')

        filter_state = filters.get('state')
        filter_agency_type = filters.get('agency_type')
        filter_states = filters.get('states')

        # Search with hybrid search + filters
        search_results = search_abstracts(
            query,
            top_k=5,
            filter_state=filter_state,
            filter_agency_type=filter_agency_type,
            filter_states=filter_states,
        )

        # Format context
        ctx = format_context(search_results)

        # Build prompt
        user_message = f"""Based on the following legal documents, please answer the user's question.
Remember: You MUST cite specific statutory authority for every claim.

RETRIEVED LEGAL CONTEXT:
{ctx}

USER QUESTION: {query}

Provide a clear, well-cited answer. If the context doesn't contain relevant information, clearly state this."""

        # Get response from LLM
        answer = call_bedrock_llm(user_message, history=history)

        # Build response (backward compatible + new fields)
        citations = [
            {
                'document': r['source_document'],
                'section': r['section_identifier'],
                'pages': r['page_numbers'],
                'statute_codes': r['statute_codes'],
                'relevance': round(r['score'], 3),
                'state': r.get('state', 'MS'),
                'agency_type': r.get('agency_type', ''),
            }
            for r in search_results
        ]

        response_body = {
            'answer': answer,
            'citations': citations,
            'query': query,
            'intent': 'general_research',
            'metadata': {},
        }

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response_body)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
