# Shared hero models (both editions use these)

| File | What | Built by |
|---|---|---|
| `habitat.glb` | Core habitat drum on legs, airlock with stairs, lab module, tanks, roof equipment | `web/scripts/blender/build_hardware.py` (Blender 5.3, scripted) |
| `ascent.glb` | Ascent vehicle: engines, landing legs, ladder, thruster quads | same script |

- Original designs by Team PlutonyX (SI-assisted Blender script). No agency insignia; markings are our own (PLUTONYX, LS-01, AV-01, hazard stripes).
- Units: metres. glTF Y up. Habitat origin = centre of the drum on the ground; rocket origin = centre of the pad.
- Materials are **named slots** with flat colours: `hull`, `graphite`, `orange`, `steel`, `foil`, `glass`, `engine`, `rubber`, `mark`. Assign real PBR materials per slot in each engine (Unity: HDRP Lit). Palette: shared/style-guide.md section 12.
- Vertex colours (COLOR_0): R = baked ambient occlusion, G = edge wear, B = engine scorch. UV0 = box projection, 2 m tiles.
- These are the uncompressed exports (Unity imports them directly with glTFast or UnityGLTF). The Web edition ships meshopt-compressed copies in `web/public/models/`.
- Not done: KTX2 textures (the models use no image textures), LODs.

Rebuild: `D:\Tools\Blender\blender.exe -b -P web/scripts/blender/build_hardware.py -- <output folder>`
