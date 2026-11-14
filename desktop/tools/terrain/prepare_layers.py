#!/usr/bin/env python3
# Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
"""Turn the Poly Haven CC0 ground textures into the four Mars terrain layers Unity uses.
For each layer: <layer>_albedo.png (tinted to a Mars colour; the tint is artistic, CTX imagery is greyscale),
<layer>_normal.png (copied) and <layer>_mask.png in HDRP's layout (R metallic, G occlusion, B detail, A smoothness).
Run after tools/fetch_textures.py:  tools/.venv/bin/python tools/terrain/prepare_layers.py"""
import os
import numpy as np
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, "..", "..", "Assets", "PlutonyX", "Textures", "PolyHaven")
dst = os.path.join(src, "Layers"); os.makedirs(dst, exist_ok=True)
#          layer id        source asset          tint (linear-ish sRGB)   contrast  smooth scale
LAYERS = [("dark_sand",   "sand_01",            (0.33, 0.20, 0.14),      0.55,     0.45),
          ("regolith",    "rocky_trail_02",     (0.60, 0.36, 0.22),      0.80,     0.30),
          ("bright_dust", "brown_mud_dry",      (0.74, 0.50, 0.32),      0.60,     0.35),
          ("steep_rock",  "dry_riverbed_rock",  (0.46, 0.29, 0.20),      0.95,     0.30)]
for lid, asset, tint, contrast, smooth in LAYERS:
    d = np.asarray(Image.open(os.path.join(src, asset, asset + "_diff_2k.jpg")).convert("RGB"), dtype=np.float64) / 255.0
    lum = d @ np.array([0.2126, 0.7152, 0.0722])
    rel = 1.0 + (lum / lum.mean() - 1.0) * contrast                    # brightness variation around 1
    chroma = d / np.maximum(lum[..., None], 1e-3)                       # keep a little of the original colour variation
    chroma = chroma / chroma.reshape(-1, 3).mean(axis=0)
    out = np.clip(np.array(tint) * rel[..., None] * (0.75 + 0.25 * chroma), 0, 1)
    Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(os.path.join(dst, lid + "_albedo.png"))
    Image.open(os.path.join(src, asset, asset + "_nor_gl_2k.jpg")).convert("RGB").save(os.path.join(dst, lid + "_normal.png"))
    arm = np.asarray(Image.open(os.path.join(src, asset, asset + "_arm_2k.jpg")).convert("RGB"), dtype=np.float64) / 255.0
    mask = np.zeros(arm.shape[:2] + (4,))
    mask[..., 1] = arm[..., 0]                                          # occlusion
    mask[..., 2] = 0.5
    mask[..., 3] = np.clip((1.0 - arm[..., 1]) * smooth, 0, 1)          # smoothness: Mars dust is matte
    Image.fromarray((mask * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(dst, lid + "_mask.png"))
    print(lid, "<-", asset, "mean albedo", np.round(out.reshape(-1, 3).mean(axis=0), 3))
