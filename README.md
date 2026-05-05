# Reglex - Regulatory AI Assistant

An AI-powered assistant built for the **Mississippi Secretary of State's Office (SoS)** to help staff verify regulatory compliance and trace statutory authority - without needing to manually search through hundreds of legal documents.

Built by students at **The University of Southern Mississippi** as part of the [Mississippi AI Innovation Hub](https://www.its.ms.gov/services/innovating/AI), a collaboration between **Mississippi ITS**, **MAIN (Mississippi Association of Independents Network)**, and **Amazon Web Services (AWS)**.

---

## What Does This Project Do?

Every year, the Mississippi Secretary of State's Office reviews administrative rules and regulations submitted by state agencies. A small policy team must manually confirm that each regulation is backed by the correct law (statutory authority). This is slow, repetitive, and inconsistent.

**Reglex solves this** by letting staff ask questions in plain English and getting back answers that are always tied to the actual legal text - with citations pointing to the exact document and page.

### Example Questions Staff Can Ask

- *"Does the Board of Medical Licensure have the authority to set licensing fees above $500?"*
- *"Compare real estate commission fines across Mississippi, Tennessee, and Alabama"*
- *"How many times does 'reciprocity' appear in dental board regulations?"*
- *"What are the testing requirements for medical licensing in Georgia vs. Texas?"*

### Key Capabilities

- **Plain-Language Q&A** - Ask questions in everyday language, no legal jargon required
- **Citation-First Responses** - Every answer includes references to the source document, page number, and relevant passage
- **Authority Verification** - Traces the chain from statute to regulation to detect unauthorized (ultra vires) actions
- **Cross-State Comparison** - Compare regulations, fees, and requirements across 7 states
- **Fee Analysis** - Analyze fee schedules against statutory caps
- **PDF Drill-Down** - Click any citation to view the original document page
- **Audit-Ready** - All queries and responses are logged for transparency and accountability

---

## Project Phases

### Phase 1 (Completed)
Internal chatbot for citation-first Q&A grounded in Mississippi SoS-provided statutes and regulations. Target accuracy: 75%+ for correct statutory referencing.

### Phase 2 (Completed)
Expanded to 6 additional states (Alabama, Louisiana, Tennessee, Arkansas, Georgia, Texas) with web crawlers monitoring 3 agency types per state. Added a research assistant for deeper cross-referencing and summarization.

---

## Architecture Overview

```
                         User (SoS Staff)
                              |
                              v
                   +--------------------+
                   |   React Frontend   |
                   | (Chat + Research)  |
                   +--------+-----------+
                            |
                            v
                   +--------------------+
                   |   API Gateway      |
                   +--------+-----------+
                            |
                            v
                   +--------------------+
                   |   AWS Lambda       |
                   |   (Orchestrator)   |
                   +--------+-----------+
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
        +---------+   +---------+   +---------+
        | Search  |   |  Fee    |   |Authority|  ... and more
        | Agent   |   | Agent   |   | Agent   |  specialized agents
        +---------+   +---------+   +---------+
              |             |             |
              +-------------+-------------+
                            |
                   +--------+---------+
                   |                  |
                   v                  v
            +------------+    +-------------+
            | OpenSearch  |    |   Bedrock   |
            | (Vector DB) |    | (LLM + Emb) |
            +------------+    +-------------+
```

### How It Works

1. **You ask a question** through the chat interface
2. **The system classifies your intent** (fee comparison, authority check, general research, etc.)
3. **A specialized AI agent** handles your query using hybrid search (combining keyword and semantic matching)
4. **Relevant document passages** are retrieved from the vector database with citations
5. **The LLM generates an answer** grounded in the retrieved legal text
6. **You get a response** with clickable citations that link back to the original PDF pages

---

## States and Agencies Covered

| State | Medical Board | Real Estate Commission | Dental Board |
|-------|:---:|:---:|:---:|
| Mississippi | Yes | Yes | Yes |
| Tennessee | Yes | Yes | Yes |
| Alabama | Yes | Yes | Yes |
| Louisiana | Yes | Yes | Yes |
| Arkansas | Yes | Yes | Yes |
| Georgia | Yes | Yes | Yes |
| Texas | Yes | Yes | Yes |

**21 total regulatory sources** crawled and indexed across 7 states and 3 agency types.

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.0.0 | UI framework |
| TypeScript | 5.9.3 | Type-safe JavaScript |
| Vite | 7.2.4 | Build tool and dev server |
| Tailwind CSS | 3.4.19 | Styling (dark theme) |
| React Router | 7.14.1 | Page navigation |
| React PDF | 9.2.0 | In-app PDF viewer |
| Axios | 1.13.2 | API communication |
| React Markdown | 10.1.0 | Rich text rendering |
| Lucide React | 0.562.0 | Icons |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11 | Runtime |
| Boto3 | 1.34+ | AWS SDK |
| Pydantic | 2.5+ | Data validation |
| PyMuPDF | 1.24+ | PDF text extraction |
| OpenSearch-py | 2.4+ | Vector database client |
| BeautifulSoup4 | 4.12+ | Web scraping for crawlers |
| Playwright | 1.40+ | Headless browser (optional, for TX) |

### AWS Services
| Service | Purpose |
|---------|---------|
| **Lambda** | Serverless compute (Python 3.11, 2048 MB) |
| **API Gateway** | REST API endpoint |
| **OpenSearch** | Vector database with hybrid search (kNN + BM25) |
| **Bedrock** | LLM inference (Mistral Large) and embeddings (Titan v2) |
| **Textract** | OCR for scanned documents and table extraction |
| **S3** | Document storage |
| **DynamoDB** | Async query job tracking |
| **SageMaker** | Notebook-based data exploration and ingestion |

### AI Models
| Model | Provider | Purpose |
|-------|----------|---------|
| Mistral Large 3 | AWS Bedrock | Answer generation, intent classification, text extraction |
| Amazon Titan Embed Text v2 | AWS Bedrock | 1024-dimensional vector embeddings for semantic search |

---

## Multi-Agent System

Reglex uses a team of specialized AI agents, each designed for a specific type of regulatory question:

| Agent | What It Does |
|-------|-------------|
| **Search Agent** | General-purpose document retrieval and Q&A |
| **Comparison Agent** | Side-by-side regulatory comparison across states |
| **Fee Analysis Agent** | Fee schedules, statutory caps, and cross-state benchmarking |
| **Term Frequency Agent** | Counts how often terms appear across documents with references |
| **Reciprocity Agent** | Analyzes out-of-state license recognition provisions |
| **Authority Agent** | Traces the legal chain: statute to delegation to regulation |
| **Reflection Agent** | Verifies that every claim in a response has a supporting citation |

A **Query Classifier** automatically routes each question to the right agent based on intent.

---

## Project Structure

```
Sos-Phase-1/
├── frontend/                  # React 19 web application
│   ├── src/
│   │   ├── components/        # UI components (Chat, Citations, Research views)
│   │   ├── hooks/             # Custom React hooks (useChat, usePDF, useFilters)
│   │   ├── pages/             # Page-level components (DocsPage)
│   │   ├── services/          # API client (ChatService)
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Citation formatting, inline citation rendering
│   └── package.json
│
├── backend/
│   ├── agents/                # Multi-agent orchestration system
│   │   ├── orchestrator.py    # Routes queries to specialized agents
│   │   ├── query_classifier.py# Intent classification (9 categories)
│   │   ├── search_agent.py    # General search and retrieval
│   │   ├── comparison_agent.py# Cross-state comparison
│   │   ├── fee_analysis_agent.py
│   │   ├── term_frequency_agent.py
│   │   ├── reciprocity_agent.py
│   │   ├── authority_agent.py # Statutory authority verification
│   │   ├── reflection_agent.py# Citation verification
│   │   └── lambdas/           # Lambda handler wrappers
│   │
│   └── crawlers/              # Web crawlers for 7 states
│       ├── base_crawler.py    # Abstract 2-tier crawl pattern
│       ├── config.py          # 21 crawl targets configuration
│       ├── ms_sos_crawler.py  # Mississippi SoS API crawler
│       ├── tn_crawler.py      # Tennessee publications crawler
│       ├── convert_to_pdf.py  # Document format conversion
│       ├── manifest.py        # Crawl tracking and deduplication
│       └── specialized/       # State-specific crawlers (AL, AR, GA, LA, TX)
│
├── ingestion/                 # Document ingestion pipeline
│   ├── pipeline.py            # Main ingestion orchestrator
│   ├── extractors.py          # PDF text extraction, OCR, embeddings
│   ├── index_manager.py       # OpenSearch index creation and mapping
│   ├── models.py              # Pydantic data models
│   └── aws_session.py         # AWS credential management
│
├── lambda_deploy/             # Deployment scripts
│   ├── build.sh               # Package Lambda dependencies
│   ├── deploy.sh              # Deploy Lambda + API Gateway
│   ├── deploy_docs.sh         # Deploy document serving endpoint
│   └── iam_policy.json        # IAM permissions
│
├── Sagemaker Files/           # SageMaker notebooks for data exploration
├── lambda_handler.py          # Main Lambda entry point
├── requirements.txt           # Python dependencies
└── proposal.md                # Original project proposal
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.11+
- **AWS CLI** configured with appropriate credentials
- Access to AWS services: Lambda, OpenSearch, Bedrock, S3, DynamoDB, Textract

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_ENDPOINT=<your-api-gateway-url>/v2/query
VITE_CHAT_ENDPOINT=<your-api-gateway-url>/v2/query
```

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Backend Setup

```bash
pip install -r requirements.txt
```

Required environment variables for Lambda deployment:

```env
OPENSEARCH_ENDPOINT=<your-opensearch-domain-url>
PHASE1_INDEX=ms-phase1-legal
PHASE2_INDEX=multistate-phase2-legal
BEDROCK_MODEL_ID=mistral.mistral-large-3-675b-instruct
BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0
AWS_REGION=us-east-1
JOBS_TABLE=ms-sos-query-jobs
```

### Deploying to AWS

```bash
# Build the Lambda package
cd lambda_deploy
./build.sh

# Deploy Lambda function and API Gateway
./deploy.sh

# Deploy the document serving endpoint
./deploy_docs.sh
```

### Running the Ingestion Pipeline

```bash
# Ensure AWS credentials are configured (SSO or environment variables)
python -m ingestion.pipeline
```

The pipeline will:
1. Download PDFs from S3
2. Extract text (PyMuPDF + Textract OCR for scanned pages)
3. Extract structured fields using Mistral
4. Generate vector embeddings using Titan
5. Index everything into OpenSearch

---

## Team

Built by graduate students at **The University of Southern Mississippi**:

| Name | Role |
|------|------|
| **Bibas Kandel** | AI and Cloud Infrastructure |
| **Mandip Adhikari** | AI and Model Development |
| **Aditya Sharma** | Frontend and Backend |
| **Kapil Sharma** | Backend and APIs |
| **Gunjan Sah** | Project Manager |
| **Saleep Shrestha** | Frontend and UI/UX |

---

## Mississippi AI Innovation Hub

This project was developed through the [Mississippi AI Innovation Hub](https://www.its.ms.gov/services/innovating/AI), a partnership between Mississippi ITS, MAIN, and Amazon Web Services.

**Key principles of the Innovation Hub:**

- **Proof of Concept** - Students get AWS sandbox access to build real-world POCs with low risk for proposers
- **Open Source** - All POCs result in open source solutions that can be built upon in production
- **Educational Investment** - Supports multidisciplinary student teams from Mississippi universities and facilitates meaningful workforce connections
- **Digital Innovation Support** - ITS, MAIN, and AWS deliver workshops to identify AI opportunities and create innovation roadmaps

---

## License

This project is open source under the [MIT License](LICENSE).

---

## Disclaimer

This tool is a **Proof of Concept** designed to support internal staff analysis. It is **not** a substitute for legal review or professional legal advice. All outputs should be verified by qualified personnel before use in any official capacity.
