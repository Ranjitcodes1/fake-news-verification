import sys
import io
from pathlib import Path
import json

# Ensure UTF-8 stdout encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
elif hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from app.services.decision import verify_article

TEST_CASES = [
    {
        "language_test": "Odia (ଓଡ଼ିଆ) — Authentic News",
        "headline": "ଓଡ଼ିଶା ସରକାର ନୂତନ ଶିଳ୍ପ ନୀତି ଅଧୀନରେ ୫୦୦ କୋଟି ଟଙ୍କାର ପ୍ରକଳ୍ପ ମଞ୍ଜୁର କଲେ",
        "content": "ରାଜ୍ୟ କ୍ୟାବିନେଟ୍ ବୈଠକରେ ଶିଳ୍ପାୟନ ଏବଂ ରୋଜଗାର ସୃଷ୍ଟି ପାଇଁ ୫୦୦ କୋଟି ଟଙ୍କାର ନୂତନ ପ୍ରକଳ୍ପ ଅନୁମୋଦନ କରାଯାଇଛି। ଶିଳ୍ପ ବିଭାଗ ପକ୍ଷରୁ ସୂଚନା ଦିଆଯାଇଛି ଯେ ଏହା ଦ୍ୱାରା ୧୦ ହଜାରରୁ ଊର୍ଦ୍ଧ୍ୱ ଯୁବକଯୁବତୀଙ୍କୁ ନିଯୁକ୍ତି ମିଳିବ। ସରକାରୀ ତଥ୍ୟ ଆଧାରରେ ତଦାରଖ ପ୍ରକ୍ରିୟା କଡ଼ାକଡ଼ି କରାଯିବ।",
    },
    {
        "language_test": "Odia (ଓଡ଼ିଆ) — Viral Fabricated Hoax",
        "headline": "ଚାଞ୍ଚଲ୍ୟକର ଖବର: ରାତି ୧୦ଟା ପରେ ସବୁ ବ୍ୟାଙ୍କ ଖାତା ବନ୍ଦ ଏବଂ ଟଙ୍କା ଜବତ ହେବ",
        "content": "ସୋସିଆଲ ମିଡିଆରେ ଭାଇରାଲ ହେଉଛି ଯେ ଆଜି ମଧ୍ୟରାତ୍ରିରୁ ସମସ୍ତ ବ୍ୟାଙ୍କ ଖାତା ସ୍ଥଗିତ ରହିବ ଏବଂ ସରକାର ସବୁ ଟଙ୍କା ନେଇଯିବେ। ଏହି ଗୁପ୍ତ ଆଦେଶ ତୁରନ୍ତ ସମସ୍ତଙ୍କୁ ସେୟାର କରନ୍ତୁ ନଚେତ୍ ସବୁ ନଷ୍ଟ ହୋଇଯିବ।",
    },
    {
        "language_test": "Hindi (हिन्दी) — Authentic News",
        "headline": "भारतीय रिजर्व बैंक ने मौद्रिक नीति समीक्षा में ब्याज दरों को स्थिर रखा",
        "content": "केंद्रीय बैंक ने मुद्रास्फीति के आंकड़ों और वैश्विक आर्थिक रुझानों की समीक्षा के बाद प्रमुख नीतिगत ब्याज दरों में कोई बदलाव नहीं किया है। अधिकारियों ने आधिकारिक प्रेस विज्ञप्ति में पुष्टि की है कि वे मूल्य स्थिरता बनाए रखने के लिए प्रतिबद्ध हैं।",
    },
    {
        "language_test": "Hindi (हिन्दी) — Viral Fabricated Hoax",
        "headline": "चौंकाने वाला खुलासा: रात 10 बजे के बाद सभी यूपीआई लेनदेन पूरी तरह बंद",
        "content": "सोशल मीडिया पर तेजी से दावा किया जा रहा है कि सरकार ने आज रात से सभी डिजिटल भुगतान और यूपीआई सेवाओं पर प्रतिबंध लगा दिया है। जल्दी से अपना पैसा निकाल लें वरना बैंक खाता फ्रीज हो जाएगा। तुरंत सभी ग्रुपों में शेयर करें।",
    },
    {
        "language_test": "Spanish (Español) — Authentic News",
        "headline": "El Banco Central mantiene los tipos de interés tras moderarse la inflación",
        "content": "La entidad bancaria central decidió mantener estables los tipos de interés de referencia durante su reunión de política monetaria. Las autoridades oficiales señalaron que seguirán evaluando los datos económicos antes de adoptar nuevas medidas.",
    },
    {
        "language_test": "English — Authentic News",
        "headline": "Central bank holds interest rates steady after inflation cools across consumer goods",
        "content": "The central bank left its benchmark interest rate unchanged on Wednesday, citing slower consumer-price growth over the past two quarters. Officials said they would continue to monitor labor-market data before considering further rate cuts in the upcoming fiscal cycle.",
    },
    {
        "language_test": "English — Viral Fabricated Hoax",
        "headline": "SHOCKING: Secret government executive order will confiscate all savings at midnight",
        "content": "An emergency leak from elite insiders revealed that all personal bank accounts are scheduled for automatic seizure tonight. They don't want you to know this secret emergency decree that freezes your funds immediately! Share before this is deleted by censors!!!",
    },
]

print("=" * 80)
print("VERITAS MULTILINGUAL VERIFICATION ENGINE LIVE TEST")
print("=" * 80)

for i, test in enumerate(TEST_CASES, 1):
    print(f"\n[TEST CASE {i}]: {test['language_test']}")
    print(f"Headline: {test['headline']}")
    
    result = verify_article(test["headline"], test["content"])
    
    print(f"-> Detected Language : {result.get('language_name')} (Code: {result.get('language')})")
    print(f"-> Assessment        : {result['prediction']}")
    print(f"-> Confidence        : {round(result['confidence'] * 100, 2)}%")
    print(f"-> Model Backend     : {result.get('backend')} ({result.get('model_version')})")
    
    # Claims
    claims = result.get("claims", [])
    print(f"-> Extracted Claims  : {len(claims)} proposition(s)")
    for c_idx, claim in enumerate(claims[:2], 1):
        print(f"   [{c_idx}] \"{claim['text']}\" (Importance: {claim.get('importance')}, Assessment: {claim.get('assessment')})")
        evidences = claim.get("evidence", [])
        if evidences:
            ev = evidences[0]
            print(f"       Evidence: [{ev.get('source_name')}] Stance: {ev.get('stance').upper()} -> \"{ev.get('title')}\"")

    # Top Token Attributions
    attributions = result.get("explanation", [])
    if attributions:
        top_tokens = [f"{a['token']} ({'+' if a['score'] > 0 else ''}{round(a['score'], 3)})" for a in attributions[:5]]
        print(f"-> Top Attributions  : {', '.join(top_tokens)}")
    
    print("-" * 80)

print("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
