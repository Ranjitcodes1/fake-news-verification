from pathlib import Path

from ml.preprocessing.generate_sample import write_sample
from ml.preprocessing.text import clean_text, load_articles
from ml.training.train_classical import train_and_evaluate


from ml.preprocessing.languages import detect_language


def test_clean_text():
    assert "http" not in clean_text("Hello HTTP://Example.com WORLD!!!")
    assert clean_text("  Foo   Bar ") == "foo bar"
    # Test Unicode preservation for Odia, Hindi, and Spanish
    assert "ଓଡ଼ିଶା" in clean_text("ଓଡ଼ିଶା ସରକାର")
    assert "हिंदी" in clean_text("हिंदी समाचार")
    assert "información" in clean_text("¡Información urgente!")


def test_language_detection():
    odia_info = detect_language("ଓଡ଼ିଶା ସରକାର ନୂତନ ଶିଳ୍ପ ନୀତି ଅଧୀନରେ ୫୦୦ କୋଟି ଟଙ୍କାର ପ୍ରକଳ୍ପ ମଞ୍ଜୁର କଲେ।")
    assert odia_info.code == "or"
    assert odia_info.name == "Odia"

    hindi_info = detect_language("भारतीय रिजर्व बैंक ने मौद्रिक नीति समीक्षा में ब्याज दरों को स्थिर रखा।")
    assert hindi_info.code == "hi"
    assert hindi_info.name == "Hindi"

    spanish_info = detect_language("El Banco Central mantiene los tipos de interés tras moderarse la inflación en el país.")
    assert spanish_info.code == "es"
    assert spanish_info.name == "Spanish"

    english_info = detect_language("The central bank held interest rates steady after inflation cooled down.")
    assert english_info.code == "en"


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
