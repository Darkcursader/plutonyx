#!/usr/bin/env python3
# Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
"""Turn the real Jezero Crater elevation model and orthoimage into files Unity can load.

Source data (NASA Mars Reconnaissance Orbiter, Context Camera; mosaics made by the USGS
Astrogeology Science Center for the Mars 2020 Terrain Relative Navigation system):
    JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif   elevation, 20 m/px
    JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif                      image,      6 m/px
Download instructions: desktop/source/README.md

Outputs (written to OUT_DIR, committed to git, read by Assets/PlutonyX/Editor/TerrainImporter.cs):
    jezero_height_<N>.raw   16-bit little-endian unsigned, N x N, row 0 = SOUTH edge, col 0 = WEST edge
    jezero_albedo_<M>.png   8-bit grey, the real orthoimage resampled (row 0 = NORTH, normal image order)
    jezero_splat_<S>.png    RGBA terrain-layer weights (R dark sand, G regolith, B bright dust, A steep rock)
    jezero_map_2048.png     tinted shaded-relief map for in-game screens (real image x real relief)
    jezero_meta.json        true-scale size in metres, elevation range, lat/lon bounds, landmarks, credits

What is real and what is not:
    * Heights are the real CTX elevation values, only resampled (bicubic) from 20 m to the Unity grid.
      No relief is invented. Metres are true scale: east-west distances are multiplied by cos(latitude)
      because the source map projection (equirectangular, standard parallel 0) stretches them by 5.4 %.
    * Layer weights come from the real image brightness and the real slope. The colour itself is an
      artistic tint: CTX is a greyscale camera.

Usage: tools/.venv/bin/python tools/terrain/process_terrain.py SOURCE_DIR OUT_DIR
"""
import json, math, os, sys
import numpy as np
import rasterio
from rasterio.enums import Resampling
from PIL import Image

DTM = "JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif"
ORTHO = "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif"
MARS_RADIUS = 3396190.0          # metres, the sphere used by the source projection
HEIGHT_RES = 2049                # Unity terrain heightmap resolution (2^n + 1)
ALBEDO_RES = 4096
SPLAT_RES = 2048

# Real places inside the map (planetocentric latitude, east longitude), with their sources.
LANDMARKS = [
    dict(id="landing_site", name="Octavia E. Butler Landing", lat=18.4447, lon=77.4508,
         note="Where the Perseverance rover touched down on 18 February 2021.",
         source="https://science.nasa.gov/mission/mars-2020-perseverance/location-map/"),
    dict(id="three_forks", name="Three Forks sample depot", lat=18.4525, lon=77.4025,
         note="Where Perseverance set down 10 backup sample tubes (Dec 2022 - Jan 2023). Approximate position.",
         source="https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/"),
    dict(id="delta_front", name="Jezero western delta front", lat=18.4750, lon=77.4000,
         note="Edge of the ancient river delta that built up in Jezero's lake. Approximate position.",
         source="https://science.nasa.gov/mission/mars-2020-perseverance/science/landing-site/"),
]


def lonlat_to_xy(lon, lat):
    return math.radians(lon) * MARS_RADIUS, math.radians(lat) * MARS_RADIUS


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def main(src_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)

    # ---------- elevation ----------
    with rasterio.open(os.path.join(src_dir, DTM)) as ds:
        native = ds.read(1).astype(np.float64)
        b = ds.bounds
        px = ds.res[0]
        heights = ds.read(1, out_shape=(HEIGHT_RES, HEIGHT_RES), resampling=Resampling.cubic).astype(np.float64)
        slope_src = ds.read(1, out_shape=(SPLAT_RES, SPLAT_RES), resampling=Resampling.cubic).astype(np.float64)
    lat_s, lat_n = math.degrees(b.bottom / MARS_RADIUS), math.degrees(b.top / MARS_RADIUS)
    lon_w, lon_e = math.degrees(b.left / MARS_RADIUS), math.degrees(b.right / MARS_RADIUS)
    lat_c = 0.5 * (lat_s + lat_n)
    size_x = (b.right - b.left) * math.cos(math.radians(lat_c))     # true metres east-west
    size_z = (b.top - b.bottom)                                      # true metres north-south
    e_min, e_max = float(native.min()), float(native.max())
    heights = np.clip(heights, e_min, e_max)                         # cubic overshoot must not leave the range
    h16 = np.round((heights - e_min) / (e_max - e_min) * 65535.0).astype("<u2")
    h16[::-1, :].tofile(os.path.join(out_dir, "jezero_height_%d.raw" % HEIGHT_RES))   # row 0 = south

    # ---------- slope (degrees) on the splat grid, true scale ----------
    dx = size_x / (SPLAT_RES - 1)
    dz = size_z / (SPLAT_RES - 1)
    gz, gx = np.gradient(slope_src, dz, dx)
    slope = np.degrees(np.arctan(np.hypot(gx, gz)))

    # ---------- orthoimage ----------
    with rasterio.open(os.path.join(src_dir, ORTHO)) as ds:
        ob = ds.bounds
        same_extent = max(abs(ob.left - b.left), abs(ob.right - b.right), abs(ob.top - b.top), abs(ob.bottom - b.bottom)) < 30
        window = rasterio.windows.from_bounds(b.left, b.bottom, b.right, b.top, ds.transform)
        alb = ds.read(1, window=window, out_shape=(ALBEDO_RES, ALBEDO_RES), resampling=Resampling.lanczos, boundless=True, fill_value=0)
        alb_s = ds.read(1, window=window, out_shape=(SPLAT_RES, SPLAT_RES), resampling=Resampling.average, boundless=True, fill_value=0)
        ortho_size = (ds.width, ds.height)
        ortho_nodata = ds.nodata
    valid = alb_s > 0
    Image.fromarray(alb, "L").save(os.path.join(out_dir, "jezero_albedo_%d.png" % ALBEDO_RES), optimize=True)

    # Normalise brightness between the 2nd and 98th percentile of the real image.
    lo, hi = np.percentile(alb_s[valid], [2, 98])
    bright = np.clip((alb_s.astype(np.float64) - lo) / (hi - lo), 0.0, 1.0)
    bright[~valid] = 0.5

    # ---------- terrain layer weights ----------
    rock = smoothstep(16.0, 30.0, slope)
    dark = smoothstep(0.42, 0.18, bright) * (1.0 - rock)
    dust = smoothstep(0.58, 0.85, bright) * (1.0 - rock)
    rego = np.clip(1.0 - rock - dark - dust, 0.0, 1.0)
    total = dark + rego + dust + rock
    splat = np.stack([dark, rego, dust, rock], axis=-1) / total[..., None]
    Image.fromarray(np.round(splat * 255.0).astype(np.uint8), "RGBA").save(os.path.join(out_dir, "jezero_splat_%d.png" % SPLAT_RES), optimize=True)

    # ---------- in-game map: real brightness x real shaded relief, Mars tint ----------
    with rasterio.open(os.path.join(src_dir, DTM)) as ds:
        m = ds.read(1, out_shape=(2048, 2048), resampling=Resampling.cubic).astype(np.float64)
    mdx, mdz = size_x / 2047.0, size_z / 2047.0
    gz, gx = np.gradient(m, mdz, mdx)
    az, alt = math.radians(315.0), math.radians(35.0)                # light from the north-west
    nx, ny, nz = -gx * 2.0, gz * 2.0, np.ones_like(m)                # 2x vertical exaggeration for readability
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    lx, ly, lz = math.sin(az) * math.cos(alt), math.cos(az) * math.cos(alt), math.sin(alt)
    shade = np.clip((nx * lx + ny * ly + nz * lz) / norm, 0.0, 1.0)
    with rasterio.open(os.path.join(src_dir, ORTHO)) as ds:
        a2 = ds.read(1, window=rasterio.windows.from_bounds(b.left, b.bottom, b.right, b.top, ds.transform),
                     out_shape=(2048, 2048), resampling=Resampling.average, boundless=True, fill_value=0).astype(np.float64)
    a2 = np.clip((a2 - lo) / (hi - lo), 0.0, 1.0)
    lum = (0.35 + 0.65 * a2) * (0.35 + 0.85 * shade)
    tint_dark, tint_light = np.array([0.20, 0.09, 0.05]), np.array([0.98, 0.74, 0.52])
    rgb = tint_dark + (tint_light - tint_dark) * np.clip(lum, 0.0, 1.0)[..., None]
    Image.fromarray(np.round(np.clip(rgb, 0, 1) * 255).astype(np.uint8), "RGB").save(os.path.join(out_dir, "jezero_map_2048.png"), optimize=True)

    # ---------- metadata ----------
    landmarks = []
    for lm in LANDMARKS:
        x, y = lonlat_to_xy(lm["lon"], lm["lat"])
        u = (x - b.left) / (b.right - b.left)          # 0 = west edge, 1 = east edge
        v = (y - b.bottom) / (b.top - b.bottom)        # 0 = south edge, 1 = north edge
        col = int(round(u * (native.shape[1] - 1)))
        row = int(round((1.0 - v) * (native.shape[0] - 1)))
        inside = 0.0 <= u <= 1.0 and 0.0 <= v <= 1.0
        landmarks.append(dict(lm, u=round(u, 6), v=round(v, 6), x_m=round(u * size_x, 1), z_m=round(v * size_z, 1),
                              elevation_m=round(float(native[row, col]), 1) if inside else None, inside=inside))
    meta = dict(
        schema="plutonyx.terrain/1", site="Jezero Crater, Mars",
        height_file="jezero_height_%d.raw" % HEIGHT_RES, height_resolution=HEIGHT_RES,
        height_format="uint16 little-endian; row 0 = south edge, column 0 = west edge",
        albedo_file="jezero_albedo_%d.png" % ALBEDO_RES, splat_file="jezero_splat_%d.png" % SPLAT_RES,
        splat_layers=["dark_sand", "regolith", "bright_dust", "steep_rock"], map_file="jezero_map_2048.png",
        size_x_m=round(size_x, 1), size_z_m=round(size_z, 1),
        elevation_min_m=round(e_min, 1), elevation_max_m=round(e_max, 1), relief_m=round(e_max - e_min, 1),
        elevation_datum="MOLA areoid (metres)",
        lat_south=round(lat_s, 6), lat_north=round(lat_n, 6), lon_west=round(lon_w, 6), lon_east=round(lon_e, 6),
        latitude_type="planetocentric", longitude_direction="positive east",
        source_pixel_m=px, source_size_px=[int(native.shape[1]), int(native.shape[0])],
        true_scale_note="East-west metres = projected metres x cos(%.4f deg); the source projection is "
                        "equirectangular with standard parallel 0." % lat_c,
        ortho_source_px=list(ortho_size), ortho_matches_dtm_extent=bool(same_extent),
        ortho_brightness_percentiles_2_98=[float(lo), float(hi)],
        slope_stats_deg=dict(mean=round(float(slope.mean()), 2), p95=round(float(np.percentile(slope, 95)), 2), max=round(float(slope.max()), 2)),
        layer_coverage=dict(zip(["dark_sand", "regolith", "bright_dust", "steep_rock"], [round(float(splat[..., i].mean()), 4) for i in range(4)])),
        landmarks=landmarks,
        credit="Elevation and image: NASA/JPL-Caltech/MSSS (Mars Reconnaissance Orbiter Context Camera); mosaics by the "
               "USGS Astrogeology Science Center for the Mars 2020 Terrain Relative Navigation system.",
        source_urls=["https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic",
                     "https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_orthorectified_image_mosaic",
                     "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/"],
        caption="This is the real terrain of Jezero Crater, from NASA Mars Reconnaissance Orbiter data.")
    with open(os.path.join(out_dir, "jezero_meta.json"), "w") as f:
        json.dump(meta, f, indent=1)
    print(json.dumps({k: meta[k] for k in ("size_x_m", "size_z_m", "elevation_min_m", "elevation_max_m", "relief_m",
                                           "lat_south", "lat_north", "lon_west", "lon_east", "ortho_matches_dtm_extent",
                                           "slope_stats_deg", "layer_coverage")}, indent=1))
    for lm in landmarks:
        print("landmark %-14s x=%8.1f m  z=%8.1f m  elev=%s  inside=%s" % (lm["id"], lm["x_m"], lm["z_m"], lm["elevation_m"], lm["inside"]))
    for f in sorted(os.listdir(out_dir)):
        print("%10.2f MB  %s" % (os.path.getsize(os.path.join(out_dir, f)) / 1e6, f))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
