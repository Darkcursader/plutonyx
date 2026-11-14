#!/usr/bin/env python3
# Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
"""Fetch raw radiation readings from NASA RadLab (OSDR) and cache them on disk.

Usage:  python3 fetch_radlab_raw.py OUT_DIR START END [INSTRUMENT_ID]
        Dates are YYYY-MM-DD (UTC). INSTRUMENT_ID defaults to MSL-RAD-Surface, the Radiation
        Assessment Detector on the Curiosity rover on the surface of Mars.

RadLab API docs: https://visualization.osdr.nasa.gov/radlab/gui/data-api/
A response already on disk is never fetched again. Each response is saved next to a .meta.json
file with the request URL and the UTC retrieval time (used for in-game attribution).
"""
import json, os, sys, time, urllib.request

API = ("https://visualization.osdr.nasa.gov/radlab/api/?instrument_id={inst}&spacecraft&trajectory"
       "&celestial_body&absorbed_dose_rate&dose_equivalent_rate&flux"
       "&timestamp%3E={start}&timestamp%3C{end}&format=json")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    out_dir, start, end = sys.argv[1], sys.argv[2], sys.argv[3]
    inst = sys.argv[4] if len(sys.argv) > 4 else "MSL-RAD-Surface"
    os.makedirs(out_dir, exist_ok=True)
    name = "%s_%s_%s" % (inst, start, end)
    path = os.path.join(out_dir, name + ".json")
    if os.path.exists(path) and os.path.getsize(path) > 200:
        print("cached  ", name)
        sys.exit(0)
    url = API.format(inst=inst, start="=" + start, end=end)
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "plutonyx-data-fetch"})
    with urllib.request.urlopen(req, timeout=180) as r:
        body = r.read()
    rows = len(json.loads(body)["data"])
    with open(path, "wb") as f:
        f.write(body)
    with open(os.path.join(out_dir, name + ".meta.json"), "w") as f:
        json.dump({"instrument_id": inst, "start": start, "end": end, "source_url": url,
                   "retrieved_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "rows": rows}, f, indent=1)
    print("fetched ", name, len(body), "bytes,", rows, "rows")
