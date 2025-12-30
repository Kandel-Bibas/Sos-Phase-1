"""
Configuration management for the CLaRa Legal Analysis System.
Handles environment variables and application settings.
"""

import os
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class LLMConfig(BaseModel):
    """LLM configuration settings."""
    provider: str = Field(default="anthropic", description="LLM provider: 'anthropic' or 'openai'")
    anthropic_api_key: str | None = Field(default=None)
    openai_api_key: str | None = Field(default=None)

    # Model settings
    compression_model: str = Field(
        default="claude-sonnet-4-20250514",
        description="Model for document compression"
    )
    chat_model: str = Field(
        default="claude-sonnet-4-20250514",
        description="Model for chat responses"
    )
    temperature: float = Field(default=0.1, description="Temperature for generation")
    max_tokens: int = Field(default=4096, description="Max tokens for responses")


class VectorStoreConfig(BaseModel):
    """Vector store configuration."""
    persist_directory: Path = Field(
        default=Path("./chroma_db"),
        description="Directory for ChromaDB persistence"
    )
    collection_name: str = Field(
        default="ms_legal_abstracts",
        description="ChromaDB collection name"
    )
    embedding_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="Sentence transformer model for embeddings"
    )


class DocumentConfig(BaseModel):
    """Document processing configuration."""
    documents_dir: Path = Field(
        default=Path("./documents"),
        description="Directory containing source PDFs"
    )
    chunk_size: int = Field(
        default=2000,
        description="Approximate chunk size for initial document splitting"
    )
    chunk_overlap: int = Field(
        default=200,
        description="Overlap between chunks"
    )


class RetrievalConfig(BaseModel):
    """Retrieval configuration."""
    top_k: int = Field(default=5, description="Number of abstracts to retrieve")
    similarity_threshold: float = Field(
        default=0.3,
        description="Minimum similarity score for retrieval"
    )


class AppConfig(BaseModel):
    """Main application configuration."""
    llm: LLMConfig = Field(default_factory=LLMConfig)
    vector_store: VectorStoreConfig = Field(default_factory=VectorStoreConfig)
    documents: DocumentConfig = Field(default_factory=DocumentConfig)
    retrieval: RetrievalConfig = Field(default_factory=RetrievalConfig)

    @classmethod
    def from_env(cls) -> "AppConfig":
        """Load configuration from environment variables."""
        return cls(
            llm=LLMConfig(
                provider=os.getenv("LLM_PROVIDER", "anthropic"),
                anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
                openai_api_key=os.getenv("OPENAI_API_KEY"),
                compression_model=os.getenv("COMPRESSION_MODEL", "claude-sonnet-4-20250514"),
                chat_model=os.getenv("CHAT_MODEL", "claude-sonnet-4-20250514"),
                temperature=float(os.getenv("LLM_TEMPERATURE", "0.1")),
                max_tokens=int(os.getenv("LLM_MAX_TOKENS", "4096")),
            ),
            vector_store=VectorStoreConfig(
                persist_directory=Path(os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")),
                collection_name=os.getenv("CHROMA_COLLECTION", "ms_legal_abstracts"),
                embedding_model=os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
            ),
            documents=DocumentConfig(
                documents_dir=Path(os.getenv("DOCUMENTS_DIR", "./documents")),
                chunk_size=int(os.getenv("CHUNK_SIZE", "2000")),
                chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "200")),
            ),
            retrieval=RetrievalConfig(
                top_k=int(os.getenv("RETRIEVAL_TOP_K", "5")),
                similarity_threshold=float(os.getenv("SIMILARITY_THRESHOLD", "0.3")),
            ),
        )


# Global configuration instance
config = AppConfig.from_env()
