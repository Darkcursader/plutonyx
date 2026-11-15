#!/usr/bin/env python3
# Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
"""Download the CC0 photo-scanned rock models from Poly Haven (https://polyhaven.com, CC0): the same rocks the
web edition uses. They are Earth rocks, tinted in the game; they are scenery, not Mars data.
Not committed to git (size); run once after cloning:  python3 tools/fetch_models.py
Files land in Assets/PlutonyX/Models/PolyHaven/<asset>/<asset>.fbx + textures/."""
import json, os, sys, time, urllib.request
ASSETS = ["namaqualand_boulder_02", "namaqualand_boulder_03", "namaqualand_boulder_05", "moon_rock_01", "moon_rock_03", "namaqualand_stones_01"]
RES = "1k"
here = os.path.dirname(os.path.abspath(__file__))
out_root = os.path.join(here, "..", "Assets", "PlutonyX", "Models", "PolyHaven")
ua = {"User-Agent": "plutonyx-hackathon"}

def get(url, dst, size):
    if os.path.exists(dst) and os.path.getsize(dst) == size:
        print("have   ", os.path.basename(dst)); return
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=ua), timeout=90) as r, open(dst + ".part", "wb") as f:
                while True:
                    chunk = r.read(1 << 16)
                    if not chunk: break
                    f.write(chunk)
            if os.path.getsize(dst + ".part") == size:
                os.replace(dst + ".part", dst); print("fetched", os.path.basename(dst), size // 1024, "KB"); return
        except Exception as e:
            print("retry", os.path.basename(dst), e)
        time.sleep(2)
    print("FAILED", dst); sys.exit(1)

for a in ASSETS:
    files = json.load(urllib.request.urlopen(urllib.request.Request("https://api.polyhaven.com/files/" + a, headers=ua), timeout=60))
    info = files["fbx"][RES]["fbx"]
    d = os.path.join(out_root, a); os.makedirs(os.path.join(d, "textures"), exist_ok=True)
    get(info["url"], os.path.join(d, a + ".fbx"), info["size"])
    for rel, inc in info.get("include", {}).items():
        get(inc["url"], os.path.join(d, rel), inc["size"])
print("done")
