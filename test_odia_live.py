import httpx
import json
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")

payload = {
    "headline": "ବର୍ଷା ଦିନେ ଗହମରେ ପୋକ ଲାଗୁଛନ୍ତି କି? ଦିଆସିଲି କାଠି ଆସିବ କାମରେ, କରନ୍ତୁ ଏମିତି ବର୍ଷବର୍ଷ ଭଲ ରହିବ!",
    "content": "ବର୍ଷା ଋତୁରେ ବାୟୁରେ ଆର୍ଦ୍ରତା ବୃଦ୍ଧି ପାଇବା ଫଳରେ ଗହମରେ ପୋକ ଲାଗିବାର ଆଶଙ୍କା ଯଥେଷ୍ଟ ବୃଦ୍ଧି ପାଏ। ସମୟ ଥାଉ ଥାଉ ରକ୍ଷଣାବେକ୍ଷଣ ନକଲେ ଶସ୍ୟ ନଷ୍ଟ ହୋଇପାରେ। ଉପଯୁକ୍ତ ରକ୍ଷଣାବେକ୍ଷଣ, ଘରୋଇ ପ୍ରତିକାର ଓ ଟିକିଏ ସତର୍କତା ସହିତ, ଆପଣ ସାରା ବର୍ଷ ଆପଣଙ୍କ ଗହମକୁ ସୁରକ୍ଷିତ ରଖିପାରିବେ।",
    "model_type": "auto",
}

t0 = time.time()
r = httpx.post("http://127.0.0.1:8000/api/v1/verify", json=payload, timeout=10.0)
elapsed = time.time() - t0

print(f"Status Code : {r.status_code}")
print(f"Elapsed Time: {elapsed:.2f}s")
data = r.json()
print(f"Detected Lang: {data.get('language')} -> {data.get('language_name')}")
print(f"Prediction   : {data.get('prediction')}")
print(f"Confidence   : {data.get('confidence') * 100:.1f}%")
print(f"Model Backend: {data.get('backend')}")
print(f"Claims Count : {len(data.get('claims', []))}")
for i, c in enumerate(data.get("claims", []), 1):
    print(f"  [{i}] {c.get('text')} (assessment: {c.get('assessment')})")
