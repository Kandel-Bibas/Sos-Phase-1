"""
AWS Lambda handler for CLaRa Legal Chatbot queries.
This is for OpenSearch Managed (not Serverless).
"""

import json
import os
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

# Environment variables
OPENSEARCH_ENDPOINT = os.environ["OPENSEARCH_ENDPOINT"]
OPENSEARCH_INDEX = os.environ["OPENSEARCH_INDEX"]
BEDROCK_MODEL_ID = os.environ["BEDROCK_MODEL_ID"]
BEDROCK_EMBEDDING_MODEL_ID = os.environ["BEDROCK_EMBEDDING_MODEL_ID"]
AWS_REGION = os.environ["AWS_REGION"]

# Initialize clients
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(
    credentials.access_key,
    credentials.secret_key,
    AWS_REGION,
    "es",  # 'es' for OpenSearch Managed (NOT 'aoss')
    session_token=credentials.token,
)

host = OPENSEARCH_ENDPOINT.replace("https://", "").replace("http://", "")
opensearch_client = OpenSearch(
    hosts=[{"host": host, "port": 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=30,
)

bedrock_client = boto3.client(service_name="bedrock-runtime", region_name=AWS_REGION)

# System prompt (same as main.py)
SYSTEM_PROMPT = """You are a legal research assistant for the Mississippi Secretary of State's office.
Your role is to help staff verify if regulations comply with Mississippi statutes.

CRITICAL REQUIREMENTS:
1. You MUST cite specific statutory authority for EVERY claim you make.
2. Citations must include: document name, section identifier (if available), and page numbers.
3. If you cannot find statutory authority for a question, clearly state this limitation.
4. Never make claims without supporting evidence from the provided legal texts."""


def get_embedding(text: str) -> list[float]:
    """Generate embedding using Bedrock Titan."""
    body = json.dumps({"inputText": text})

    response = bedrock_client.invoke_model(
        modelId=BEDROCK_EMBEDDING_MODEL_ID,
        body=body,
        contentType="application/json",
        accept="application/json",
    )

    response_body = json.loads(response["body"].read())
    return response_body["embedding"]


def search_abstracts(query: str, top_k: int = 5) -> list[dict]:
    """Search OpenSearch for relevant abstracts."""
    query_embedding = get_embedding(query)

    knn_query = {
        "size": top_k,
        "query": {"knn": {"embedding_vector": {"vector": query_embedding, "k": top_k}}},
    }

    response = opensearch_client.search(index=OPENSEARCH_INDEX, body=knn_query)

    results = []
    for hit in response["hits"]["hits"]:
        results.append(
            {
                "abstract_text": hit["_source"]["abstract_text"],
                "core_rule": hit["_source"]["core_rule"],
                "source_document": hit["_source"]["source_document"],
                "page_numbers": hit["_source"]["page_numbers"],
                "section_identifier": hit["_source"].get("section_identifier"),
                "statute_codes": hit["_source"]["statute_codes"],
                "original_text": hit["_source"]["original_text"][:2000],
                "score": hit["_score"],
            }
        )

    return results


def format_context(results: list[dict]) -> str:
    """Format search results into context for LLM."""
    if not results:
        return "No relevant legal documents found for this query."

    context_parts = []
    for result in results:
        pages = ", ".join(str(p) for p in result["page_numbers"])
        section = result["section_identifier"] or "N/A"

        context_parts.append(
            f"""
---
SOURCE: {result['source_document']} (Section: {section}, Pages: {pages})
RELEVANCE SCORE: {result['score']:.2f}
STATUTE CODES: {', '.join(result['statute_codes']) if result['statute_codes'] else 'None identified'}

SUMMARY: {result['abstract_text']}

CORE RULE: {result['core_rule']}

ORIGINAL TEXT (for precise citation):
{result['original_text']}
---"""
        )

    return "\n".join(context_parts)


def call_bedrock_llm(user_message: str) -> str:
    """Call Bedrock LLM for response generation (supports Claude and Mistral)."""

    # Detect model type
    is_mistral = "mistral" in BEDROCK_MODEL_ID.lower()

    if is_mistral:
        # Mistral format
        prompt = f"""<s>[INST] {SYSTEM_PROMPT}

{user_message} [/INST]"""

        body = json.dumps(
            {"prompt": prompt, "max_tokens": 4096, "temperature": 0.1, "top_p": 0.9}
        )

        response = bedrock_client.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )

        response_body = json.loads(response["body"].read())
        return response_body["outputs"][0]["text"]

    else:
        # Claude format
        body = json.dumps(
            {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4096,
                "temperature": 0.1,
                "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": user_message}],
            }
        )

        response = bedrock_client.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )

        response_body = json.loads(response["body"].read())
        return response_body["content"][0]["text"]


def lambda_handler(event, context):
    """Main Lambda handler."""
    try:
        # Parse request
        if "body" in event:
            body = json.loads(event["body"])
        else:
            body = event

        query = body.get("query", "")
        if not query:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Query parameter is required"}),
            }

        # Search for relevant abstracts
        search_results = search_abstracts(query, top_k=5)

        # Format context
        context = format_context(search_results)

        # Build prompt
        user_message = f"""Based on the following legal documents from Mississippi law, please answer the user's question.
Remember: You MUST cite specific statutory authority for every claim.

RETRIEVED LEGAL CONTEXT:
{context}

USER QUESTION: {query}

Provide a clear, well-cited answer. If the context doesn't contain relevant information, clearly state this."""

        # Get response from LLM (Mistral or Claude)
        answer = call_bedrock_llm(user_message)

        # Build response
        citations = [
            {
                "document": r["source_document"],
                "section": r["section_identifier"],
                "pages": r["page_numbers"],
                "statute_codes": r["statute_codes"],
                "relevance": round(r["score"], 3),
            }
            for r in search_results
        ]

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(
                {"answer": answer, "citations": citations, "query": query}
            ),
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": str(e)}),
        }
