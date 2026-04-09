# Repository Review

- [x] Inspect repository structure and product documentation
- [x] Read core backend runtime paths
- [x] Read frontend application flow
- [x] Synthesize architecture summary and improvement recommendations

## Review Notes

- Product intent: Mississippi Secretary of State regulatory research assistant with a Phase 1 citation-first RAG chatbot and a Phase 2 multi-state research/crawling expansion.
- Architecture: crawlers collect official regulatory documents, SageMaker scripts chunk/compress/embed them into OpenSearch, Lambda agents classify and answer legal research questions, and the React frontend presents cited chat/research workflows with PDF drill-down.
- Verification completed: `frontend` TypeScript check passed via `npm run lint`, and Python sources compiled successfully via `python3 -m compileall backend lambda_handler.py documents.py tn_documents.py`.
- Main concerns: duplicated Phase 1/Phase 2 code paths, heavy LLM dependence for both classification and extraction, and limited automated testing around retrieval quality and legal-answer correctness.
