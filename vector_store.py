"""
Vector Store module using ChromaDB for the CLaRa Legal Analysis System.

This module handles:
- Embedding compressed abstracts using sentence transformers
- Storing and retrieving from ChromaDB
- Similarity search for query matching
"""

import json
from pathlib import Path
from typing import Callable, Optional

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

from config import config, VectorStoreConfig
from models import CompressedAbstract, RetrievalResult


class VectorStore:
    """
    ChromaDB-based vector store for compressed legal abstracts.

    In the CLaRa approach, we embed the compressed abstracts (not raw text)
    to enable intent-based retrieval rather than keyword matching.
    """

    def __init__(self, vs_config: Optional[VectorStoreConfig] = None):
        self.config = vs_config or config.vector_store
        self._init_embedding_model()
        self._init_chromadb()

    def _init_embedding_model(self):
        """Initialize the sentence transformer embedding model."""
        self.embedding_model = SentenceTransformer(self.config.embedding_model)

    def _init_chromadb(self):
        """Initialize ChromaDB client and collection."""
        # Ensure persist directory exists
        self.config.persist_directory.mkdir(parents=True, exist_ok=True)

        # Initialize ChromaDB with persistence
        self.client = chromadb.PersistentClient(
            path=str(self.config.persist_directory),
            settings=Settings(anonymized_telemetry=False)
        )

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=self.config.collection_name,
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity
        )

    def _create_embedding_text(self, abstract: CompressedAbstract) -> str:
        """
        Create the text to embed from a compressed abstract.

        We combine multiple fields to create a rich embedding that captures
        the legal intent and can match various query formulations.
        """
        parts = [
            abstract.abstract_text,
            f"Core rule: {abstract.core_rule}",
        ]

        if abstract.statute_codes:
            parts.append(f"Statutes: {', '.join(abstract.statute_codes)}")

        if abstract.compliance_requirements:
            parts.append(f"Requirements: {'; '.join(abstract.compliance_requirements)}")

        if abstract.section_identifier:
            parts.append(f"Section: {abstract.section_identifier}")

        return " | ".join(parts)

    def _abstract_to_metadata(self, abstract: CompressedAbstract) -> dict:
        """Convert abstract to ChromaDB metadata dict."""
        return {
            "source_document": abstract.source_document,
            "source_path": abstract.source_path,
            "page_numbers": json.dumps(abstract.page_numbers),
            "section_identifier": abstract.section_identifier or "",
            "core_rule": abstract.core_rule,
            "statute_codes": json.dumps(abstract.statute_codes),
            "compliance_requirements": json.dumps(abstract.compliance_requirements),
            "legal_entities": json.dumps(abstract.legal_entities),
            "document_type": abstract.document_type,
            "compression_model": abstract.compression_model,
            # Store original text for precise citations (truncated if too long)
            "original_text": abstract.original_text[:5000] if len(abstract.original_text) > 5000 else abstract.original_text,
        }

    def _metadata_to_abstract(self, abstract_id: str, document: str, metadata: dict) -> CompressedAbstract:
        """Reconstruct abstract from ChromaDB metadata."""
        return CompressedAbstract(
            abstract_id=abstract_id,
            source_document=metadata["source_document"],
            source_path=metadata["source_path"],
            page_numbers=json.loads(metadata["page_numbers"]),
            section_identifier=metadata["section_identifier"] or None,
            abstract_text=document,  # The document stored in ChromaDB is the abstract text
            core_rule=metadata["core_rule"],
            statute_codes=json.loads(metadata["statute_codes"]),
            compliance_requirements=json.loads(metadata["compliance_requirements"]),
            legal_entities=json.loads(metadata["legal_entities"]),
            original_text=metadata["original_text"],
            document_type=metadata["document_type"],
            compression_model=metadata["compression_model"],
        )

    def add_abstract(self, abstract: CompressedAbstract):
        """Add a single compressed abstract to the vector store."""
        embedding_text = self._create_embedding_text(abstract)
        embedding = self.embedding_model.encode(embedding_text).tolist()

        self.collection.add(
            ids=[abstract.abstract_id],
            embeddings=[embedding],
            documents=[abstract.abstract_text],
            metadatas=[self._abstract_to_metadata(abstract)]
        )

    def add_abstracts(
        self,
        abstracts: list[CompressedAbstract],
        batch_size: int = 100,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ):
        """
        Add multiple abstracts to the vector store in batches.

        Args:
            abstracts: List of compressed abstracts to add
            batch_size: Number of abstracts per batch
            progress_callback: Optional callback(current, total) for progress
        """
        total = len(abstracts)

        for i in range(0, total, batch_size):
            batch = abstracts[i:i + batch_size]

            ids = [a.abstract_id for a in batch]
            embedding_texts = [self._create_embedding_text(a) for a in batch]
            embeddings = self.embedding_model.encode(embedding_texts).tolist()
            documents = [a.abstract_text for a in batch]
            metadatas = [self._abstract_to_metadata(a) for a in batch]

            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )

            if progress_callback:
                progress_callback(min(i + batch_size, total), total)

    def search(
        self,
        query: str,
        top_k: Optional[int] = None,
        filter_document: Optional[str] = None
    ) -> list[RetrievalResult]:
        """
        Search for relevant abstracts matching the query.

        Args:
            query: Natural language query
            top_k: Number of results to return (default from config)
            filter_document: Optional filter to specific document name

        Returns:
            List of RetrievalResult objects sorted by relevance
        """
        top_k = top_k or config.retrieval.top_k

        # Embed the query
        query_embedding = self.embedding_model.encode(query).tolist()

        # Build where filter if needed
        where_filter = None
        if filter_document:
            where_filter = {"source_document": filter_document}

        # Query ChromaDB
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        # Convert to RetrievalResult objects
        retrieval_results = []
        if results["ids"] and results["ids"][0]:
            for i, abstract_id in enumerate(results["ids"][0]):
                # ChromaDB returns L2 distance by default, convert to similarity
                # For cosine space, distance is 1 - similarity
                distance = results["distances"][0][i]
                similarity = 1 - distance

                # Skip results below threshold
                if similarity < config.retrieval.similarity_threshold:
                    continue

                abstract = self._metadata_to_abstract(
                    abstract_id=abstract_id,
                    document=results["documents"][0][i],
                    metadata=results["metadatas"][0][i]
                )

                retrieval_results.append(RetrievalResult(
                    abstract=abstract,
                    similarity_score=similarity,
                    rank=i + 1
                ))

        return retrieval_results

    def get_all_documents(self) -> list[str]:
        """Get list of all unique source documents in the store."""
        # Get all metadata
        results = self.collection.get(include=["metadatas"])

        documents = set()
        if results["metadatas"]:
            for meta in results["metadatas"]:
                documents.add(meta["source_document"])

        return sorted(list(documents))

    def get_stats(self) -> dict:
        """Get statistics about the vector store."""
        count = self.collection.count()
        documents = self.get_all_documents()

        return {
            "total_abstracts": count,
            "unique_documents": len(documents),
            "documents": documents,
            "collection_name": self.config.collection_name,
            "embedding_model": self.config.embedding_model,
        }

    def clear(self):
        """Clear all data from the collection."""
        self.client.delete_collection(self.config.collection_name)
        self.collection = self.client.get_or_create_collection(
            name=self.config.collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def delete_document(self, document_name: str):
        """Delete all abstracts from a specific document."""
        # Get IDs of abstracts from this document
        results = self.collection.get(
            where={"source_document": document_name},
            include=[]
        )

        if results["ids"]:
            self.collection.delete(ids=results["ids"])
