from __future__ import annotations

import json
from hashlib import sha256
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from services.settings import Settings

try:
    from groq import AsyncGroq
except ImportError:  # pragma: no cover
    AsyncGroq = None  # type: ignore[assignment,misc]

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class GroqUnavailableError(RuntimeError):
    """Raised when the LLM service is not configured."""


class GroqResponseError(RuntimeError):
    """Raised when the LLM returns an unusable response."""


class GroqBudgetExceededError(RuntimeError):
    """Raised when a run exceeds the configured token budget."""


class GroqService:
    """LLM service — powered by Groq (free tier, fast inference)."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = settings.groq_model
        self.api_key = settings.groq_api_key
        self._cache: dict[str, BaseModel] = {}
        self._run_estimated_tokens: dict[str, int] = {}
        self._client = None
        if self.api_key and AsyncGroq is not None:
            self._client = AsyncGroq(api_key=self.api_key)

    @property
    def is_available(self) -> bool:
        return self._client is not None

    async def generate_structured(
        self,
        *,
        prompt: str,
        schema: type[SchemaT],
        system_instruction: str = "",
        temperature: float = 0.3,
        model: str | None = None,
        max_tokens: int | None = None,
        run_id: str | None = None,
        agent: str = "NEXUS",
        cache_enabled: bool = True,
    ) -> SchemaT:
        if not self.is_available:
            raise GroqUnavailableError(
                "Groq is not configured. Set GROQ_API_KEY in your .env file."
            )

        selected_model = model or self.model
        selected_max_tokens = max_tokens if max_tokens is not None else 800
        normalized_prompt = " ".join(prompt.split())
        normalized_system = " ".join(system_instruction.split())
        cache_key = self._cache_key(
            model=selected_model,
            schema=schema,
            prompt=normalized_prompt,
            system_instruction=normalized_system,
            temperature=temperature,
            max_tokens=selected_max_tokens,
        )

        if cache_enabled and cache_key in self._cache:
            return self._cache[cache_key].model_copy(deep=True)  # type: ignore[return-value]

        if run_id:
            estimated_prompt_tokens = self._estimate_tokens(normalized_prompt + normalized_system)
            projected = (
                self._run_estimated_tokens.get(run_id, 0)
                + estimated_prompt_tokens
                + selected_max_tokens
            )
            if projected > self.settings.token_budget_per_run:
                raise GroqBudgetExceededError(
                    f"Estimated token budget exceeded for run {run_id} at agent {agent}."
                )

        json_guardrail = (
            "Return output as valid JSON only. "
            "Do not include markdown, prose, or code fences."
        )

        messages: list[dict] = []
        if system_instruction:
            messages.append(
                {"role": "system", "content": f"{system_instruction}\n\n{json_guardrail}"}
            )
        else:
            messages.append({"role": "system", "content": json_guardrail})
        messages.append({"role": "user", "content": f"{prompt}\n\nRespond in JSON."})

        response = await self._client.chat.completions.create(
            model=selected_model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=temperature,
            max_tokens=selected_max_tokens,
        )

        text = (response.choices[0].message.content or "").strip()
        if not text:
            raise GroqResponseError("Groq returned an empty response.")

        try:
            parsed = schema.model_validate(json.loads(text))
        except (json.JSONDecodeError, ValidationError):
            # Retry once with stricter instruction and more output room.
            retry_max_tokens = min(max(selected_max_tokens * 2, selected_max_tokens + 300), 1800)
            retry_messages = [
                {
                    "role": "system",
                    "content": (
                        f"{system_instruction}\n\n{json_guardrail}\n"
                        "Output MUST be parseable JSON that matches the requested schema."
                    ).strip(),
                },
                {
                    "role": "user",
                    "content": (
                        f"{prompt}\n\nRespond in JSON. "
                        "Ensure all arrays/objects are properly closed."
                    ),
                },
            ]
            retry_response = await self._client.chat.completions.create(
                model=selected_model,
                messages=retry_messages,
                response_format={"type": "json_object"},
                temperature=min(temperature, 0.2),
                max_tokens=retry_max_tokens,
            )
            retry_text = (retry_response.choices[0].message.content or "").strip()
            if not retry_text:
                raise GroqResponseError("Groq returned an empty response.")
            try:
                parsed = schema.model_validate(json.loads(retry_text))
                response = retry_response
                text = retry_text
            except json.JSONDecodeError as exc:
                raise GroqResponseError(
                    f"Groq returned malformed JSON: {retry_text[:200]}"
                ) from exc
            except ValidationError as exc:
                first_error = exc.errors()[0] if exc.errors() else {"msg": "unknown validation error"}
                raise GroqResponseError(
                    f"Groq JSON failed schema validation for {schema.__name__}: {first_error.get('msg')}"
                ) from exc

        if run_id:
            usage = getattr(response, "usage", None)
            completion_tokens = getattr(usage, "completion_tokens", 0) if usage else 0
            prompt_tokens = getattr(usage, "prompt_tokens", 0) if usage else 0
            if not (completion_tokens or prompt_tokens):
                prompt_tokens = self._estimate_tokens(normalized_prompt + normalized_system)
                completion_tokens = self._estimate_tokens(text)
            self._run_estimated_tokens[run_id] = (
                self._run_estimated_tokens.get(run_id, 0) + prompt_tokens + completion_tokens
            )
        if cache_enabled:
            self._cache[cache_key] = parsed.model_copy(deep=True)
        return parsed

    def _estimate_tokens(self, text: str) -> int:
        # Coarse heuristic for budget guardrails before usage metadata is available.
        return max(1, len(text) // 4)

    def _cache_key(
        self,
        *,
        model: str,
        schema: type[SchemaT],
        prompt: str,
        system_instruction: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        signature = (
            f"{model}|{schema.__name__}|{temperature}|{max_tokens}|"
            f"{system_instruction}|{prompt}"
        )
        return sha256(signature.encode("utf-8")).hexdigest()
