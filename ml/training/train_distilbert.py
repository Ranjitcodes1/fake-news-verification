"""Optional DistilBERT fine-tuning. Runs on CPU if no GPU is present.

This script is intentionally conservative (small max length, early stopping).
It records measured metrics only after an actual training run.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train-csv", default=str(ROOT / "ml" / "data" / "processed" / "train.csv"))
    parser.add_argument("--val-csv", default=str(ROOT / "ml" / "data" / "processed" / "validation.csv"))
    parser.add_argument("--test-csv", default=str(ROOT / "ml" / "data" / "processed" / "test.csv"))
    parser.add_argument("--output-dir", default=str(ROOT / "models" / "distilbert"))
    parser.add_argument("--model-name", default="distilbert-base-uncased")
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        import pandas as pd
        import torch
        from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
        from torch.utils.data import Dataset
        from transformers import (
            DistilBertForSequenceClassification,
            DistilBertTokenizerFast,
            Trainer,
            TrainingArguments,
            set_seed,
        )
    except ImportError as exc:
        raise SystemExit(
            "Install extras from backend/requirements-ml.txt to fine-tune DistilBERT."
        ) from exc

    set_seed(args.seed)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    class NewsDataset(Dataset):
        def __init__(self, csv_path: str, tokenizer: DistilBertTokenizerFast, max_length: int):
            frame = pd.read_csv(csv_path)
            self.texts = frame["text"].fillna(frame["text_clean"]).astype(str).tolist()
            self.labels = frame["label_id"].astype(int).tolist()
            self.tokenizer = tokenizer
            self.max_length = max_length

        def __len__(self) -> int:
            return len(self.texts)

        def __getitem__(self, idx: int):
            encoded = self.tokenizer(
                self.texts[idx],
                truncation=True,
                padding="max_length",
                max_length=self.max_length,
                return_tensors="pt",
            )
            item = {key: value.squeeze(0) for key, value in encoded.items()}
            item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
            return item

    tokenizer = DistilBertTokenizerFast.from_pretrained(args.model_name)
    model = DistilBertForSequenceClassification.from_pretrained(args.model_name, num_labels=2)
    train_ds = NewsDataset(args.train_csv, tokenizer, args.max_length)
    val_ds = NewsDataset(args.val_csv, tokenizer, args.max_length)
    test_ds = NewsDataset(args.test_csv, tokenizer, args.max_length)

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = logits.argmax(axis=-1)
        probs = torch.softmax(torch.tensor(logits), dim=-1).numpy()[:, 1]
        metrics = {
            "accuracy": float(accuracy_score(labels, preds)),
            "precision": float(precision_score(labels, preds, zero_division=0)),
            "recall": float(recall_score(labels, preds, zero_division=0)),
            "f1": float(f1_score(labels, preds, zero_division=0)),
        }
        try:
            metrics["roc_auc"] = float(roc_auc_score(labels, probs))
        except ValueError:
            metrics["roc_auc"] = None
        return metrics

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    training_args = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        weight_decay=args.weight_decay,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        seed=args.seed,
        report_to=[],
        use_cpu=device == "cpu",
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=compute_metrics,
    )
    trainer.train()
    test_metrics = trainer.evaluate(test_ds)
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))
    elapsed = time.perf_counter() - started
    record = {
        "model": args.model_name,
        "device": device,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "learning_rate": args.learning_rate,
        "max_length": args.max_length,
        "weight_decay": args.weight_decay,
        "seed": args.seed,
        "training_seconds": elapsed,
        "test_metrics": {k: v for k, v in test_metrics.items() if k.startswith("eval_")},
        "notes": ["Metrics recorded only after this training run. CPU fallback is supported."],
    }
    (output_dir / "training_metrics.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
