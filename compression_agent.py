"""
CLaRa-style Compression Agent for Legal Documents.

This module implements the "Latent Compression" step of the CLaRa approach:
Instead of embedding raw text chunks, we use an LLM to compress legal sections
into dense, information-rich abstracts that capture legal intent and statutory references.
"""

import json
import hashlib
from typing import Any, Callable, Optional

import anthropic
import openai

from config import config, LLMConfig
from models import DocumentChunk, CompressedAbstract


# Compression prompt template for legal documents
COMPRESSION_PROMPT = """You are a legal document analyst specializing in Mississippi state law.
Your task is to compress the following legal text into a structured, information-rich abstract.

IMPORTANT: Extract and preserve ALL statutory references, section numbers, and legal citations exactly as they appear.

<legal_text>
{text}
</legal_text>

<source_metadata>
Document: {document_name}
Pages: {pages}
</source_metadata>

Analyze this legal text and provide a JSON response with the following structure:

{{
    "abstract_text": "A dense 2-4 sentence summary capturing the legal intent, scope, and key provisions. Include relevant statute numbers.",
    "core_rule": "The primary rule, requirement, or regulation stated in one clear sentence.",
    "statute_codes": ["List of specific statute codes mentioned, e.g., 'Miss. Code Ann. § 75-1-101'"],
    "compliance_requirements": ["List of specific compliance requirements, duties, or obligations mentioned"],
    "legal_entities": ["List of agencies, offices, positions, or entities mentioned"],
    "section_identifier": "The section/chapter identifier if clearly stated (e.g., 'Section 75-1-101', 'Rule 1.1'), or null if not present",
    "document_type": "One of: 'statute', 'regulation', 'administrative_rule', 'procedural_rule', 'definition', 'other'"
}}

Guidelines:
1. Be precise with statute citations - preserve exact formatting (e.g., "§", "Ann.", section numbers)
2. For compliance requirements, use action verbs (e.g., "Must file annual report by March 1")
3. The abstract should be searchable - include key legal terms someone might query
4. If the text is a definition section, clearly note what terms are being defined
5. Preserve any cross-references to other statutes or regulations

Return ONLY the JSON object, no additional text."""


class CompressionAgent:
    """
    Agent responsible for compressing raw legal text into structured abstracts.
    Uses LLM to extract legal intent, statute codes, and compliance requirements.
    """

    def __init__(self, llm_config: Optional[LLMConfig] = None):
        self.config = llm_config or config.llm
        self._init_client()

    def _init_client(self):
        """Initialize the appropriate LLM client."""
        if self.config.provider == "anthropic":
            if not self.config.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY not set in environment")
            self.client = anthropic.Anthropic(api_key=self.config.anthropic_api_key)
        elif self.config.provider == "openai":
            if not self.config.openai_api_key:
                raise ValueError("OPENAI_API_KEY not set in environment")
            self.client = openai.OpenAI(api_key=self.config.openai_api_key)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.config.provider}")

    def _generate_abstract_id(self, chunk: DocumentChunk) -> str:
        """Generate a unique ID for the abstract based on content hash."""
        content = f"{chunk.document_name}:{chunk.page_numbers}:{chunk.raw_text[:500]}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def _call_llm(self, prompt: str) -> str:
        """Call the LLM with the given prompt."""
        if self.config.provider == "anthropic":
            response = self.client.messages.create(
                model=self.config.compression_model,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        else:  # openai
            response = self.client.chat.completions.create(
                model=self.config.compression_model,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content

    def _parse_llm_response(self, response: str) -> dict[str, Any]:
        """Parse the JSON response from the LLM."""
        # Clean up response - remove markdown code blocks if present
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            # Return a fallback structure if parsing fails
            return {
                "abstract_text": f"[Parsing error] {response[:500]}",
                "core_rule": "Unable to parse LLM response",
                "statute_codes": [],
                "compliance_requirements": [],
                "legal_entities": [],
                "section_identifier": None,
                "document_type": "other",
                "_parse_error": str(e)
            }

    def compress(self, chunk: DocumentChunk) -> CompressedAbstract:
        """
        Compress a document chunk into a structured abstract.

        This is the core CLaRa "latent compression" step.

        Args:
            chunk: The raw document chunk to compress

        Returns:
            CompressedAbstract with extracted legal information
        """
        # Build the prompt
        pages_str = ", ".join(str(p) for p in chunk.page_numbers)
        prompt = COMPRESSION_PROMPT.format(
            text=chunk.raw_text,
            document_name=chunk.document_name,
            pages=pages_str
        )

        # Call LLM
        response = self._call_llm(prompt)

        # Parse response
        parsed = self._parse_llm_response(response)

        # Build the compressed abstract
        return CompressedAbstract(
            abstract_id=self._generate_abstract_id(chunk),
            source_document=chunk.document_name,
            source_path=chunk.document_path,
            page_numbers=chunk.page_numbers,
            section_identifier=parsed.get("section_identifier"),
            abstract_text=parsed.get("abstract_text", ""),
            core_rule=parsed.get("core_rule", ""),
            statute_codes=parsed.get("statute_codes", []),
            compliance_requirements=parsed.get("compliance_requirements", []),
            legal_entities=parsed.get("legal_entities", []),
            original_text=chunk.raw_text,
            document_type=parsed.get("document_type", "unknown"),
            compression_model=self.config.compression_model
        )

    def compress_batch(
        self,
        chunks: list[DocumentChunk],
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> list[CompressedAbstract]:
        """
        Compress multiple chunks into abstracts.

        Args:
            chunks: List of document chunks to compress
            progress_callback: Optional callback(current, total) for progress updates

        Returns:
            List of compressed abstracts
        """
        abstracts = []
        total = len(chunks)

        for i, chunk in enumerate(chunks):
            try:
                abstract = self.compress(chunk)
                abstracts.append(abstract)
            except Exception as e:
                # Log error but continue processing
                print(f"Error compressing chunk {chunk.chunk_id}: {e}")
                # Create a minimal abstract to preserve the content
                abstracts.append(CompressedAbstract(
                    abstract_id=self._generate_abstract_id(chunk),
                    source_document=chunk.document_name,
                    source_path=chunk.document_path,
                    page_numbers=chunk.page_numbers,
                    section_identifier=chunk.section_title,
                    abstract_text=f"[Compression failed] {chunk.raw_text[:200]}...",
                    core_rule="Compression failed - see original text",
                    statute_codes=[],
                    compliance_requirements=[],
                    legal_entities=[],
                    original_text=chunk.raw_text,
                    document_type="unknown",
                    compression_model=self.config.compression_model
                ))

            if progress_callback:
                progress_callback(i + 1, total)

        return abstracts
