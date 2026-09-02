from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ml.preprocessing.text import clean_text, combine_headline_content

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TRANSFORMER_DIR = ROOT / "models" / "distilbert"


class TransformerInference:
    """Inference engine for fine-tuned DistilBERT / Hugging Face transformer models."""

    def __init__(self, model_dir: Path = DEFAULT_TRANSFORMER_DIR):
        self.model_dir = Path(model_dir)
        self.tokenizer = None
        self.model = None
        self.device = "cpu"
        self.metrics: dict[str, Any] = {}
        self.is_ready = False
        self._load()

    def _load(self) -> None:
        if not self.model_dir.exists():
            return

        # Check for model weights
        weights_exist = any(
            (self.model_dir / f).exists()
            for f in ("model.safetensors", "pytorch_model.bin")
        )
        if not weights_exist:
            return

        try:
            import torch
            from transformers import DistilBertForSequenceClassification, DistilBertTokenizerFast

            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.tokenizer = DistilBertTokenizerFast.from_pretrained(str(self.model_dir))
            self.model = DistilBertForSequenceClassification.from_pretrained(str(self.model_dir))
            self.model.to(self.device)
            self.model.eval()

            metrics_file = self.model_dir / "training_metrics.json"
            if metrics_file.exists():
                self.metrics = json.loads(metrics_file.read_text(encoding="utf-8"))
            self.is_ready = True
        except Exception:
            self.is_ready = False

    @property
    def model_version(self) -> str:
        return str(self.metrics.get("model", "distilbert-base-uncased-finetuned"))

    def predict(self, headline: str, content: str) -> dict[str, Any]:
        if not self.is_ready or self.model is None or self.tokenizer is None:
            raise RuntimeError("Transformer model is not loaded or unavailable.")

        import torch

        text = combine_headline_content(headline, content)
        cleaned = clean_text(text)
        if not cleaned:
            raise ValueError("Article text is empty after cleaning")

        encoded = self.tokenizer(
            cleaned,
            truncation=True,
            max_length=256,
            padding=True,
            return_tensors="pt",
        )
        input_ids = encoded["input_ids"].to(self.device)
        attention_mask = encoded["attention_mask"].to(self.device)

        with torch.no_grad():
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1).squeeze(0).cpu().numpy()

        real_proba = float(probs[0])
        fake_proba = float(probs[1])

        tokens = self.tokenizer.convert_ids_to_tokens(input_ids[0].cpu())
        attributions = self._extract_token_attributions(tokens, fake_proba)

        return {
            "fake_probability": fake_proba,
            "real_probability": real_proba,
            "model_version": self.model_version,
            "backend": "distilbert_transformer",
            "attributions": attributions,
            "optional_lime": [],
            "cleaned_text": cleaned,
            "raw_text": text,
        }

    def _extract_token_attributions(self, tokens: list[str], fake_proba: float) -> list[dict[str, Any]]:
        special_tokens = {"[CLS]", "[SEP]", "[PAD]", "<s>", "</s>", "<pad>"}
        unique_words: dict[str, float] = {}

        for token in tokens:
            cleaned_token = token.replace("##", "").strip()
            if cleaned_token.lower() in special_tokens or len(cleaned_token) < 3:
                continue
            unique_words[cleaned_token] = unique_words.get(cleaned_token, 0.0) + 1.0

        direction = "fake" if fake_proba >= 0.5 else "real"
        sorted_tokens = sorted(unique_words.items(), key=lambda x: x[1], reverse=True)[:10]

        attributions = []
        for word, count in sorted_tokens:
            score = round((fake_proba - 0.5) * 0.2 * min(count, 3.0), 4)
            attributions.append(
                {
                    "token": word,
                    "score": score,
                    "direction": direction,
                    "influence": "high" if abs(score) >= 0.08 else "medium" if abs(score) >= 0.03 else "low",
                }
            )
        return attributions
