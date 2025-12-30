#!/usr/bin/env python3
"""
CLaRa Legal Analysis Chatbot - Main Interface.

This is the chat interface for the Mississippi Secretary of State
AI Innovation Hub legal document assistant.

Features:
- Natural language Q&A about Mississippi statutes and regulations
- CLaRa-style retrieval using compressed legal abstracts
- Mandatory citation of statutory authority for every answer
- Interactive CLI with conversation history

Usage:
    python main.py              # Start interactive chat
    python main.py --query "..."  # Single query mode
"""

import json
from typing import Any

import typer
import anthropic
import openai
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.table import Table

from config import config
from models import ChatResponse, RetrievalResult
from vector_store import VectorStore

console = Console()
app = typer.Typer(help="CLaRa Legal Analysis Chatbot")


# System prompt for the chat model
CHAT_SYSTEM_PROMPT = """You are a legal research assistant for the Mississippi Secretary of State's office.
Your role is to help staff verify if regulations comply with Mississippi statutes.

CRITICAL REQUIREMENTS:
1. You MUST cite specific statutory authority for EVERY claim you make.
2. Citations must include: document name, section identifier (if available), and page numbers.
3. If you cannot find statutory authority for a question, clearly state this limitation.
4. Never make claims without supporting evidence from the provided legal texts.

When answering questions:
1. First, identify the relevant statutes or regulations from the provided context.
2. Explain the legal requirements or rules clearly.
3. Always include formal citations in this format: [Document Name, Section X, pp. Y-Z]
4. If there are multiple relevant sources, cite all of them.
5. If the context doesn't contain relevant information, say so clearly.

Your answers should be:
- Accurate and grounded in the provided legal texts
- Clear and accessible to non-lawyers
- Properly cited with specific references
- Honest about limitations or uncertainties"""


class LegalChatbot:
    """
    CLaRa-powered legal chatbot with mandatory citations.

    Implements the CLaRa retrieval approach:
    1. Query is matched against compressed abstracts (intent-based retrieval)
    2. Retrieved abstracts provide rich context for generation
    3. Original text is available for precise citations
    """

    def __init__(self):
        self.vector_store = VectorStore()
        self._init_llm_client()
        self.conversation_history: list[dict] = []

    def _init_llm_client(self):
        """Initialize LLM client based on configuration."""
        if config.llm.provider == "anthropic":
            if not config.llm.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY not set")
            self.client = anthropic.Anthropic(api_key=config.llm.anthropic_api_key)
        else:
            if not config.llm.openai_api_key:
                raise ValueError("OPENAI_API_KEY not set")
            self.client = openai.OpenAI(api_key=config.llm.openai_api_key)

    def _format_context(self, results: list[RetrievalResult]) -> str:
        """Format retrieved abstracts into context for the LLM."""
        if not results:
            return "No relevant legal documents found for this query."

        context_parts = []
        for result in results:
            abstract = result.abstract
            citation = abstract.get_citation()

            context_parts.append(f"""
---
SOURCE: {citation}
RELEVANCE SCORE: {result.similarity_score:.2f}
DOCUMENT TYPE: {abstract.document_type}

SUMMARY: {abstract.abstract_text}

CORE RULE: {abstract.core_rule}

STATUTE CODES: {', '.join(abstract.statute_codes) if abstract.statute_codes else 'None identified'}

COMPLIANCE REQUIREMENTS:
{chr(10).join('- ' + req for req in abstract.compliance_requirements) if abstract.compliance_requirements else 'None identified'}

ORIGINAL TEXT (for precise citation):
{abstract.original_text[:2000]}{'...' if len(abstract.original_text) > 2000 else ''}
---""")

        return "\n".join(context_parts)

    def _build_messages(self, query: str, context: str) -> list[dict]:
        """Build the message list for the LLM."""
        messages = []

        # Add conversation history (limited to last 10 exchanges)
        for msg in self.conversation_history[-20:]:
            messages.append(msg)

        # Add current query with context
        user_message = f"""Based on the following legal documents from Mississippi law, please answer the user's question.
Remember: You MUST cite specific statutory authority for every claim.

RETRIEVED LEGAL CONTEXT:
{context}

USER QUESTION: {query}

Provide a clear, well-cited answer. If the context doesn't contain relevant information, clearly state this."""

        messages.append({"role": "user", "content": user_message})

        return messages

    def _call_llm(self, messages: list[dict]) -> str:
        """Call the LLM with the given messages."""
        if config.llm.provider == "anthropic":
            response = self.client.messages.create(
                model=config.llm.chat_model,
                max_tokens=config.llm.max_tokens,
                temperature=config.llm.temperature,
                system=CHAT_SYSTEM_PROMPT,
                messages=messages
            )
            return response.content[0].text
        else:
            # OpenAI format
            openai_messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}] + messages
            response = self.client.chat.completions.create(
                model=config.llm.chat_model,
                max_tokens=config.llm.max_tokens,
                temperature=config.llm.temperature,
                messages=openai_messages
            )
            return response.choices[0].message.content

    def _extract_citations(self, results: list[RetrievalResult]) -> list[dict[str, Any]]:
        """Extract citation information from retrieval results."""
        citations = []
        for result in results:
            abstract = result.abstract
            citations.append({
                "citation": abstract.get_citation(),
                "document": abstract.source_document,
                "section": abstract.section_identifier,
                "pages": abstract.page_numbers,
                "statute_codes": abstract.statute_codes,
                "relevance_score": round(result.similarity_score, 3)
            })
        return citations

    def query(self, question: str) -> ChatResponse:
        """
        Process a user query and return a cited response.

        Args:
            question: Natural language question about legal matters

        Returns:
            ChatResponse with answer, citations, and retrieved context
        """
        # Step 1: Retrieve relevant abstracts (CLaRa retrieval)
        results = self.vector_store.search(
            query=question,
            top_k=config.retrieval.top_k
        )

        # Step 2: Format context from compressed abstracts
        context = self._format_context(results)

        # Step 3: Build messages and call LLM
        messages = self._build_messages(question, context)
        answer = self._call_llm(messages)

        # Step 4: Update conversation history
        self.conversation_history.append({"role": "user", "content": question})
        self.conversation_history.append({"role": "assistant", "content": answer})

        # Step 5: Build response with citations
        citations = self._extract_citations(results)

        confidence_note = None
        if not results:
            confidence_note = "No relevant documents found. Answer may be based on general knowledge."
        elif all(r.similarity_score < 0.5 for r in results):
            confidence_note = "Retrieved documents have low relevance scores. Answer may be incomplete."

        return ChatResponse(
            answer=answer,
            citations=citations,
            retrieved_abstracts=results,
            confidence_note=confidence_note
        )

    def clear_history(self):
        """Clear conversation history."""
        self.conversation_history = []


def display_response(response: ChatResponse):
    """Display the chatbot response with formatting."""
    # Display answer
    console.print("\n")
    console.print(Panel(
        Markdown(response.answer),
        title="[bold green]Answer[/bold green]",
        border_style="green"
    ))

    # Display confidence note if any
    if response.confidence_note:
        console.print(f"\n[yellow]Note: {response.confidence_note}[/yellow]")

    # Display citations
    if response.citations:
        console.print("\n[bold cyan]Sources Cited:[/bold cyan]")
        table = Table(show_header=True, header_style="bold cyan")
        table.add_column("Citation", style="white")
        table.add_column("Statute Codes", style="yellow")
        table.add_column("Relevance", style="green")

        for cite in response.citations:
            statute_codes = ", ".join(cite["statute_codes"]) if cite["statute_codes"] else "-"
            table.add_row(
                cite["citation"],
                statute_codes,
                f"{cite['relevance_score']:.2%}"
            )

        console.print(table)


def interactive_chat():
    """Run interactive chat session."""
    console.print(Panel(
        "[bold]Mississippi Secretary of State[/bold]\n"
        "[cyan]AI Innovation Hub - Legal Document Assistant[/cyan]\n\n"
        "Ask questions about Mississippi statutes and regulations.\n"
        "All answers will include statutory citations.\n\n"
        "[dim]Commands: 'quit' to exit, 'clear' to reset conversation, 'sources' to list indexed documents[/dim]",
        title="CLaRa Legal Chatbot",
        border_style="blue"
    ))

    try:
        chatbot = LegalChatbot()
    except ValueError as e:
        console.print(f"[red]Error: {e}[/red]")
        console.print("[yellow]Please set the required API key in your environment or .env file.[/yellow]")
        raise typer.Exit(1)

    # Check if we have indexed documents
    stats = chatbot.vector_store.get_stats()
    if stats["total_abstracts"] == 0:
        console.print("\n[yellow]Warning: No documents have been indexed yet![/yellow]")
        console.print("[yellow]Run 'python ingest.py' first to ingest legal documents.[/yellow]\n")

    while True:
        try:
            console.print("\n")
            query = console.input("[bold blue]You:[/bold blue] ").strip()

            if not query:
                continue

            if query.lower() == "quit":
                console.print("[green]Goodbye![/green]")
                break

            if query.lower() == "clear":
                chatbot.clear_history()
                console.print("[green]Conversation history cleared.[/green]")
                continue

            if query.lower() == "sources":
                stats = chatbot.vector_store.get_stats()
                console.print(f"\n[bold]Indexed Documents ({stats['total_abstracts']} abstracts):[/bold]")
                for doc in stats["documents"]:
                    console.print(f"  - {doc}")
                continue

            # Process query
            with console.status("[bold green]Searching legal documents..."):
                response = chatbot.query(query)

            display_response(response)

        except KeyboardInterrupt:
            console.print("\n[green]Goodbye![/green]")
            break
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")


@app.command()
def chat():
    """Start interactive chat session."""
    interactive_chat()


@app.command()
def query(
    question: str = typer.Argument(..., help="Question to ask"),
    json_output: bool = typer.Option(False, "--json", "-j", help="Output as JSON")
):
    """Ask a single question (non-interactive mode)."""
    try:
        chatbot = LegalChatbot()
    except ValueError as e:
        console.print(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)

    response = chatbot.query(question)

    if json_output:
        output = {
            "answer": response.answer,
            "citations": response.citations,
            "confidence_note": response.confidence_note
        }
        console.print(json.dumps(output, indent=2))
    else:
        display_response(response)


@app.command()
def sources():
    """List all indexed source documents."""
    vector_store = VectorStore()
    stats = vector_store.get_stats()

    console.print(f"\n[bold]Vector Store Statistics:[/bold]")
    console.print(f"  Total Abstracts: {stats['total_abstracts']}")
    console.print(f"  Unique Documents: {stats['unique_documents']}")

    if stats["documents"]:
        console.print(f"\n[bold]Indexed Documents:[/bold]")
        for doc in stats["documents"]:
            console.print(f"  - {doc}")
    else:
        console.print("\n[yellow]No documents indexed yet. Run 'python ingest.py' first.[/yellow]")


if __name__ == "__main__":
    app()
