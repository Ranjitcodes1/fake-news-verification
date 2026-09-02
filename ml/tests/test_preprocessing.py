from pathlib import Path

from ml.preprocessing.generate_sample import write_sample
from ml.preprocessing.text import clean_text, load_articles
from ml.training.train_classical import train_and_evaluate


def test_clean_text():
    assert "http" not in clean_text("Hello HTTP://Example.com WORLD!!!")
    assert clean_text("  Foo   Bar ") == "foo bar"


def test_load_and_train(tmp_path: Path):
    csv_path = tmp_path / "sample.csv"
    write_sample(csv_path)
    frame = load_articles(str(csv_path))
    assert set(frame["label"].unique()) <= {"real", "fake"}
    assert frame["text_clean"].duplicated().sum() == 0
    result = train_and_evaluate(csv_path)
    assert result["best_model"]
    comparison = result["comparison"]
    assert "logistic_regression" in comparison
    metrics = comparison[result["best_model"]]["validation"]
    for key in ("accuracy", "precision", "recall", "f1"):
        assert key in metrics
        assert 0.0 <= metrics[key] <= 1.0
