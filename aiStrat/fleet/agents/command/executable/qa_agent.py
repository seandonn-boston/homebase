"""Executable QA Agent — the first runnable agent in the fleet.

This agent demonstrates the full pipeline: system prompt assembly,
Brain context injection, tool routing, and model invocation.

It reviews code changes by:
1. Loading its system prompt from the agent definition
2. Querying the Brain for relevant quality patterns and lessons
3. Assembling context per the prompt anatomy (Identity > Authority > Constraints > Knowledge > Task)
4. Invoking the model with the assembled prompt
5. Recording its findings back to the Brain

Usage:
    python -m fleet.agents.command.executable.qa_agent --diff "$(git diff)"
    python -m fleet.agents.command.executable.qa_agent --file path/to/file.py

Requires: ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys

logger = logging.getLogger(__name__)

# ── System Prompt Components ──────────────────────────────────

IDENTITY = """You are the QA Agent for the Fleet Admiral framework. You review code
changes, implementation output, and system configurations for correctness,
security, and alignment with established patterns."""

AUTHORITY = """Decision authority: Peer Review tier.
- You MAY: flag issues, request changes, approve clean output.
- You MAY NOT: modify code directly, override architectural decisions,
  approve your own output, or skip review steps.
- Zero findings is a red flag — report it explicitly if you find nothing."""

CONSTRAINTS = """Review constraints:
- Every finding must include: SEVERITY (blocker/major/minor/cosmetic),
  LOCATION (file:line or component), CONFIDENCE (verified/assessed/assumed).
- Do not suggest stylistic changes unless they affect correctness.
- Do not suggest adding features or expanding scope.
- Focus on: logic correctness, security vulnerabilities, edge cases,
  contract violations, and architectural alignment."""

KNOWLEDGE_TEMPLATE = """Relevant Brain knowledge for this review:
{brain_context}"""

TASK_TEMPLATE = """Review the following code changes and produce a structured
QA report. For each finding, use this format:

ISSUE: [one sentence]
SEVERITY: [Blocker | Major | Minor | Cosmetic]
LOCATION: [file, line, or component]
EXPECTED: [what should happen]
ACTUAL: [what actually happens]
CONFIDENCE: [Verified | Assessed | Assumed]

If no issues are found, state "NO ISSUES FOUND" and explain why this
is not a red flag (or flag it as a concern if appropriate).

Code to review:
```
{code}
```"""


# ── Agent Runner ──────────────────────────────────────────────

class QAAgent:
    """Executable QA agent with Brain integration and model invocation."""

    def __init__(self, brain=None, model_provider: str = "anthropic"):
        self._brain = brain
        self._model_provider = model_provider

    def _query_brain(self, code_snippet: str) -> str:
        """Query the Brain for relevant patterns and lessons."""
        if not self._brain:
            return "(Brain not connected — reviewing without institutional knowledge)"

        try:
            # Find relevant quality patterns
            results = self._brain.server.brain_query(
                query=f"code review quality patterns for: {code_snippet[:200]}",
                token=self._get_read_token(),
                limit=3,
                min_score=0.3,
            )
            if not results:
                return "(No relevant Brain entries found)"

            context_parts = []
            for r in results:
                context_parts.append(
                    f"- [{r['category'].upper()}] {r['title']}: {r['content'][:200]}..."
                )
            return "\n".join(context_parts)
        except Exception as e:
            logger.warning("Brain query failed: %s", e)
            return f"(Brain query failed: {e})"

    def _get_read_token(self) -> str:
        """Get a read token for Brain access."""
        return os.environ.get("BRAIN_READ_TOKEN", "")

    def assemble_prompt(self, code: str) -> list[dict[str, str]]:
        """Assemble the full prompt per the prompt anatomy.

        Order: Identity > Authority > Constraints > Knowledge > Task
        """
        brain_context = self._query_brain(code)

        system_prompt = "\n\n".join([
            IDENTITY,
            AUTHORITY,
            CONSTRAINTS,
            KNOWLEDGE_TEMPLATE.format(brain_context=brain_context),
        ])

        user_message = TASK_TEMPLATE.format(code=code[:50000])  # Cap input size

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

    def review(self, code: str) -> str:
        """Run a full QA review cycle.

        1. Assemble prompt with Brain context
        2. Invoke the model
        3. Return the structured review
        """
        messages = self.assemble_prompt(code)

        # Try Anthropic first, fall back to OpenAI
        if self._model_provider == "anthropic":
            return self._invoke_anthropic(messages)
        else:
            return self._invoke_openai(messages)

    def _invoke_anthropic(self, messages: list[dict]) -> str:
        """Invoke Claude via the Anthropic API."""
        try:
            import anthropic
        except ImportError:
            logger.warning("anthropic package not installed, falling back to OpenAI")
            return self._invoke_openai(messages)

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return self._invoke_openai(messages)

        client = anthropic.Anthropic(api_key=api_key)
        system = messages[0]["content"]
        user_msgs = [{"role": m["role"], "content": m["content"]} for m in messages[1:]]

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system,
            messages=user_msgs,
            timeout=60.0,
        )
        return response.content[0].text

    def _invoke_openai(self, messages: list[dict]) -> str:
        """Invoke via the OpenAI API."""
        try:
            import openai
        except ImportError:
            return (
                "ERROR: No model provider available. Install 'anthropic' or 'openai' "
                "and set ANTHROPIC_API_KEY or OPENAI_API_KEY."
            )

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return "ERROR: No API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."

        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=4096,
            timeout=60.0,
        )
        return response.choices[0].message.content

    def record_findings(self, review_text: str, code_context: str) -> None:
        """Record QA findings back to the Brain."""
        if not self._brain:
            return

        try:
            write_token = os.environ.get("BRAIN_WRITE_TOKEN", "")
            if not write_token:
                return

            self._brain.server.brain_record(
                project="fleet-admiral",
                category="lesson",
                title=f"QA review finding: {code_context[:100]}",
                content=review_text[:5000],
                token=write_token,
                source_agent="qa-agent",
                metadata={"tags": ["qa", "review", "automated"]},
            )
        except Exception as e:
            logger.warning("Failed to record findings to Brain: %s", e)


# ── CLI ───────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Fleet QA Agent — code review")
    parser.add_argument("--diff", help="Git diff text to review")
    parser.add_argument("--file", help="File path to review")
    parser.add_argument("--provider", default="anthropic", choices=["anthropic", "openai"],
                        help="Model provider (default: anthropic)")
    args = parser.parse_args()

    if args.diff:
        code = args.diff
        context = "git diff"
    elif args.file:
        with open(args.file, "r") as f:
            code = f.read()
        context = args.file
    else:
        # Read from stdin
        code = sys.stdin.read()
        context = "stdin"

    if not code.strip():
        print("No code provided for review.")
        sys.exit(1)

    agent = QAAgent(model_provider=args.provider)
    print("=" * 60)
    print("  QA Agent Review")
    print("=" * 60)
    print()

    review = agent.review(code)
    print(review)
    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
