# CLaRa Legal Analysis System

**Mississippi Secretary of State - AI Innovation Hub (Phase 1)**

A Proof of Concept chatbot that assists staff in reviewing state regulations against statutory authority, using a CLaRa-inspired (Contrastive Latent Retrieval for Augmentation) approach for intelligent document retrieval.

## Overview

### The Problem

SoS staff currently struggle to manually verify if new regulations comply with Mississippi statutes due to volume and limited capacity.

### The Solution

An interactive chatbot that:
- Ingests Mississippi Statutes and Administrative Regulations
- Allows natural language Q&A
- **Cites specific statutory authority for every answer** (Transparency & Governance requirement)
- Achieves high accuracy in linking regulations to their enabling statutes

## CLaRa-Inspired Architecture

This system implements a **CLaRa-inspired approach** rather than vanilla RAG (Retrieve-Augment-Generate). The key difference:

| Vanilla RAG | CLaRa Approach (This System) |
|-------------|------------------------------|
| Chunk raw text → Embed → Retrieve | **Compress** → Embed abstracts → Retrieve |
| Keyword-based matching | Intent-based semantic matching |
| Raw text in context window | Dense, information-rich abstracts |

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INGESTION PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PDF Documents                                                             │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────┐    ┌──────────────────────┐    ┌───────────────────┐     │
│   │   Extract   │───▶│  LLM Compression     │───▶│  Vector Store     │     │
│   │   & Chunk   │    │  (CLaRa "Latent")    │    │  (ChromaDB)       │     │
│   └─────────────┘    └──────────────────────┘    └───────────────────┘     │
│                              │                            │                 │
│                              ▼                            ▼                 │
│                      Extracts:                    Embeds & Indexes:         │
│                      • Legal intent               • Compressed abstracts    │
│                      • Statute codes              • Full metadata           │
│                      • Compliance reqs            • Original text           │
│                      • Section identifiers                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            QUERY PIPELINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Question                                                             │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────┐    ┌──────────────────────┐    ┌───────────────────┐     │
│   │   Embed     │───▶│  Semantic Search     │───▶│  LLM Generation   │     │
│   │   Query     │    │  (Intent Matching)   │    │  (With Citations) │     │
│   └─────────────┘    └──────────────────────┘    └───────────────────┘     │
│                              │                            │                 │
│                              ▼                            ▼                 │
│                      Retrieves:                   Generates:                │
│                      • Relevant abstracts         • Cited answer            │
│                      • Similarity scores          • Source references       │
│                      • Original text              • Statute codes           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Compression Output Example

For each document section, the LLM extracts:

```json
{
  "abstract_text": "This section establishes filing requirements for corporate annual reports under Miss. Code Ann. § 79-4-16.22, requiring all domestic corporations to submit reports to the Secretary of State by April 1st annually.",
  "core_rule": "Domestic corporations must file annual reports with the Secretary of State by April 1st each year.",
  "statute_codes": ["Miss. Code Ann. § 79-4-16.22", "Miss. Code Ann. § 79-4-1.01"],
  "compliance_requirements": [
    "File annual report by April 1st",
    "Include registered agent information",
    "Pay prescribed filing fee"
  ],
  "legal_entities": ["Secretary of State", "domestic corporations"],
  "document_type": "statute"
}
```

## Project Structure

```
Sos-Phase-1/
├── config.py              # Configuration management (Pydantic-based)
├── models.py              # Data models (DocumentChunk, CompressedAbstract, etc.)
├── compression_agent.py   # CLaRa-style LLM compression agent
├── vector_store.py        # ChromaDB vector store with sentence-transformers
├── ingest.py              # Document ingestion CLI pipeline
├── main.py                # Interactive chat interface
├── requirements.txt       # Python dependencies
├── .env.example           # Environment configuration template
└── documents/             # Place PDF documents here
    └── .gitkeep
```

## Installation

### Prerequisites

- Python 3.11+
- Anthropic API key (or OpenAI API key)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Sos-Phase-1
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your API key:
   ```env
   ANTHROPIC_API_KEY=your-api-key-here
   ```

## Usage

### Step 1: Add Documents

Place your Mississippi Statutes and Administrative Regulations PDFs in the `documents/` folder:

```bash
cp /path/to/your/legal-documents/*.pdf documents/
```

### Step 2: Ingest Documents

Run the ingestion pipeline to compress and index documents:

```bash
# Ingest all documents
python ingest.py

# Clear existing data and re-ingest
python ingest.py --clear

# Ingest a specific document
python ingest.py --document "Mississippi_Code_Title_79.pdf"

# View ingestion statistics
python ingest.py stats
```

The ingestion process will:
1. Extract text from PDFs with page tracking
2. Split into manageable chunks
3. **Compress each chunk using LLM** (the CLaRa "latent" step)
4. Embed and store in ChromaDB

### Step 3: Start the Chatbot

```bash
# Interactive mode
python main.py

# Single query mode
python main.py query "What are the filing requirements for corporations?"

# JSON output (for programmatic use)
python main.py query "What are the filing requirements?" --json
```

### Chat Commands

Once in interactive mode:

| Command | Description |
|---------|-------------|
| `quit` | Exit the chatbot |
| `clear` | Clear conversation history |
| `sources` | List all indexed documents |

### Example Interaction

```
╭─────────────────────────────────────────────────────────────────╮
│                     CLaRa Legal Chatbot                         │
│                                                                 │
│  Mississippi Secretary of State                                 │
│  AI Innovation Hub - Legal Document Assistant                   │
│                                                                 │
│  Ask questions about Mississippi statutes and regulations.      │
│  All answers will include statutory citations.                  │
╰─────────────────────────────────────────────────────────────────╯

You: What are the requirements for forming a nonprofit corporation?

╭─────────────────────── Answer ───────────────────────╮
│ Under Mississippi law, forming a nonprofit           │
│ corporation requires the following:                  │
│                                                      │
│ 1. **Articles of Incorporation** must be filed      │
│    with the Secretary of State containing:          │
│    - Corporate name (with "Corporation" or "Inc.")  │
│    - Registered agent and office address            │
│    - Names of incorporators                         │
│    - Statement of nonprofit purpose                 │
│                                                      │
│ [Mississippi Nonprofit Corporation Act,             │
│  Section 79-11-101, pp. 12-15]                      │
╰──────────────────────────────────────────────────────╯

Sources Cited:
┌────────────────────────────────────┬─────────────────────┬───────────┐
│ Citation                           │ Statute Codes       │ Relevance │
├────────────────────────────────────┼─────────────────────┼───────────┤
│ MS_Nonprofit_Act.pdf, § 79-11-101  │ Miss. Code § 79-11  │ 87.3%     │
│ MS_Business_Regs.pdf, Rule 1.2     │ Miss. Code § 79-4   │ 72.1%     │
└────────────────────────────────────┴─────────────────────┴───────────┘
```

## Configuration

All settings can be configured via environment variables or `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `anthropic` | LLM provider (`anthropic` or `openai`) |
| `ANTHROPIC_API_KEY` | - | Your Anthropic API key |
| `OPENAI_API_KEY` | - | Your OpenAI API key (if using OpenAI) |
| `COMPRESSION_MODEL` | `claude-sonnet-4-20250514` | Model for document compression |
| `CHAT_MODEL` | `claude-sonnet-4-20250514` | Model for chat responses |
| `CHUNK_SIZE` | `2000` | Characters per document chunk |
| `RETRIEVAL_TOP_K` | `5` | Number of abstracts to retrieve |
| `SIMILARITY_THRESHOLD` | `0.3` | Minimum similarity score |

## Technical Details

### Why CLaRa Over Vanilla RAG?

1. **Intent Matching**: Queries match against *legal intent* in abstracts, not just keywords in raw text
2. **Richer Context**: Compressed abstracts are information-dense, capturing statute codes, compliance requirements, and legal entities
3. **Better Citations**: Metadata is preserved during compression, enabling precise citations
4. **Reduced Noise**: Abstracts filter out boilerplate text, focusing on legally relevant content

### Models Used

- **Compression & Chat**: Claude Sonnet 4 (configurable)
- **Embeddings**: `all-MiniLM-L6-v2` via sentence-transformers
- **Vector Store**: ChromaDB with cosine similarity

### True CLaRa vs. This Implementation

This is a **CLaRa-inspired PoC** using "offline compression" rather than Apple's full CLaRa implementation which requires:
- Training custom neural compressors
- End-to-end gradient optimization
- Differentiable top-k retrieval

For production, consider using Apple's [CLaRa-7B models](https://huggingface.co/apple/CLaRa-7B-Instruct) or the [ml-clara codebase](https://github.com/apple/ml-clara).

## Success Metrics

Per project scope requirements:
- **Target**: Chatbot returns information with ≥75% accuracy
- **Transparency**: Every answer cites specific statutory authority
- **Governance**: Links portions of text to relevant statutes and codes

## References

- [CLaRa Paper (arXiv)](https://arxiv.org/abs/2511.18659)
- [Apple ml-clara GitHub](https://github.com/apple/ml-clara)
- [CLaRa-7B on HuggingFace](https://huggingface.co/apple/CLaRa-7B-Instruct)

## License

See [LICENSE](LICENSE) file.
