#!/usr/bin/env python3
# Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
"""Download the CC0 ground textures used by the terrain from Poly Haven (https://polyhaven.com, CC0).
They are not committed to git (size); run this once after cloning:  python3 tools/fetch_textures.py
Files land in Assets/PlutonyX/Textures/PolyHaven/<asset>/ as <asset>_{diff,nor_gl,arm}_2k.jpg."""
import json, os, sys, urllib.request
ASSETS = ["sand_01", "rocky_trail_02", "brown_mud_dry", "dry_riverbed_rock"]
MAPS = {"Diffuse": "diff", "nor_gl": "nor_gl", "arm": "arm", "Rough": "rough"}
RES = "2k"
here = os.path.dirname(os.path.abspath(__file__))
out_root = os.path.join(here, "..", "Assets", "PlutonyX", "Textures", "PolyHaven")
ua = {"User-Agent": "plutonyx-hackathon"}
for a in ASSETS:
    files = json.load(urllib.request.urlopen(urllib.request.Request("https://api.polyhaven.com/files/" + a, headers=ua), timeout=60))
    os.makedirs(os.path.join(out_root, a), exist_ok=True)
    for key, short in MAPS.items():
        try: info = files[key][RES]["jpg"]
        except KeyError: continue
        dst = os.path.join(out_root, a, "%s_%s_%s.jpg" % (a, short, RES))
        if os.path.exists(dst) and os.path.getsize(dst) == info["size"]: print("have   ", os.path.basename(dst)); continue
        urllib.request.urlretrieve(info["url"], dst)
        print("fetched", os.path.basename(dst), info["size"] // 1024, "KB")
