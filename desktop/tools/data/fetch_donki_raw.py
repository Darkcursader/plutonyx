#!/usr/bin/env python3
# Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
"""Fetch raw NASA DONKI space-weather records and cache them on disk.

Usage:  python3 fetch_donki_raw.py OUT_DIR START END TYPE [TYPE ...]
        TYPE is one of FLR CME SEP GST (DONKI event types). Dates are YYYY-MM-DD (UTC).

Two official NASA endpoints are tried in order:
  1. https://ccmc.gsfc.nasa.gov/DONKI/WS/get/   CCMC's own web service (no key, no hourly limit)
  2. https://api.nasa.gov/DONKI/                the NASA Open APIs gateway to the same database
     (key from the NASA_API_KEY environment variable, else the rate-limited DEMO_KEY)
A response already on disk is never fetched again, so re-running is free. Each response is saved
next to a .meta.json file holding the source URL (never the key) and the UTC retrieval time, which
build_snapshot.py copies into the snapshot's attribution block.
"""
import json, os, sys, time, urllib.request, urllib.error

ENDPOINTS = [
    ("https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{type}?startDate={start}&endDate={end}", False),
    ("https://api.nasa.gov/DONKI/{type}?startDate={start}&endDate={end}", True),
]

def fetch(out_dir, start, end, typ, key):
    name = "%s_%s_%s" % (typ, start, end)
    path = os.path.join(out_dir, name + ".json")
    if os.path.exists(path) and os.path.getsize(path) > 2:
        print("cached  ", name); return True
    body, url, last_error = None, None, None
    for template, needs_key in ENDPOINTS:
        url = template.format(type=typ, start=start, end=end)
        req = urllib.request.Request(url + ("&api_key=" + key if needs_key else ""),
                                     headers={"Accept": "application/json", "User-Agent": "plutonyx-data-fetch"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                body = r.read()
            json.loads(body) if body.strip() else None      # must be valid JSON, else try the next endpoint
            break
        except urllib.error.HTTPError as e:
            last_error = "HTTP %s" % e.code; body = None
        except Exception as e:  # timeout, DNS, reset, bad JSON
            last_error = repr(e); body = None
    if body is None:
        print("FAILED  ", name, last_error); return False
    data = json.loads(body) if body.strip() else []
    with open(path, "wb") as f: f.write(body if body.strip() else b"[]")
    with open(os.path.join(out_dir, name + ".meta.json"), "w") as f:
        json.dump({"type": typ, "start": start, "end": end, "source_url": url,
                   "retrieved_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                   "records": len(data)}, f, indent=1)
    print("fetched ", name, len(body), "bytes,", len(data), "records, from", url.split("/")[2])
    return True

if __name__ == "__main__":
    if len(sys.argv) < 5: sys.exit(__doc__)
    out_dir, start, end = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out_dir, exist_ok=True)
    key = os.environ.get("NASA_API_KEY", "DEMO_KEY")
    ok = all([fetch(out_dir, start, end, t, key) for t in sys.argv[4:]])
    sys.exit(0 if ok else 1)
