# desktop/source — large raw files (not in git)

Everything in this folder except this README is git-ignored. Re-create it with the commands below
(run from `desktop/`). All of it is public NASA / USGS data.

## Terrain — Jezero Crater (NASA MRO Context Camera, mosaics by USGS Astrogeology)
```
mkdir -p source/terrain && cd source/terrain
B=https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn
curl -L -C - -O $B/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif   # 9.7 MB
curl -L -C - -O $B/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif                       # 36.3 MB
```
Catalogue pages: https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic
and https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ . Higher-resolution HiRISE tiles (1 m elevation,
25 cm image) live under `$B/HiRISE/`; they are internally tiled, so a small window can be read with rasterio
(`/vsicurl/`) without downloading the whole file.

Then: `tools/.venv/bin/python tools/terrain/process_terrain.py source/terrain TerrainData`

## Space weather and radiation — NASA DONKI and NASA RadLab
```
python3 tools/data/fetch_donki_raw.py  source/donki-raw  2024-05-01 2024-05-31 FLR CME SEP GST
python3 tools/data/fetch_donki_raw.py  source/donki-raw  2017-09-01 2017-09-30 FLR CME SEP GST
python3 tools/data/fetch_donki_raw.py  source/donki-raw  2026-10-15 2026-11-14 FLR CME SEP GST
python3 tools/data/fetch_radlab_raw.py source/radlab-raw 2024-05-08 2024-05-26
python3 tools/data/fetch_radlab_raw.py source/radlab-raw 2017-09-06 2017-09-18
python3 tools/data/build_snapshot.py   source/donki-raw source/radlab-raw Assets/StreamingAssets/data
```
The built timelines in `Assets/StreamingAssets/data/` **are** committed, so the game never needs these raw files.
