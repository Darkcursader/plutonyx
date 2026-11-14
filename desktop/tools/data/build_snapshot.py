#!/usr/bin/env python3
# Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
"""Build the game's ARCHIVED space-weather timelines from raw NASA records.

Input  (cached raw responses, produced by fetch_donki_raw.py and fetch_radlab_raw.py):
    RAW_DONKI/{FLR,CME,SEP,GST}_<start>_<end>.json (+ .meta.json)
    RAW_RADLAB/MSL-RAD-Surface_<start>_<end>.json  (+ .meta.json)
Output (one small JSON per timeline, read by both editions at runtime):
    OUT/timeline-<id>.json   and   OUT/SOURCES.md

Nothing is invented here: every value is copied or directly computed (mean / median / max) from
the raw records, and each timeline carries the source URLs and the UTC retrieval time. The only
editorial choices are which fields to keep and how to bin radiation readings (hourly means).

Usage: python3 build_snapshot.py RAW_DONKI RAW_RADLAB OUT
"""
import json, os, sys, statistics
from datetime import datetime, timedelta

TIMELINES = [
    # id, title, DONKI range, RadLab range (or None), window used by missions, kid-facing blurb
    dict(id="may-2024", title="The great solar storms of May 2024",
         donki=("2024-05-01", "2024-05-31"), radlab=("2024-05-08", "2024-05-26"),
         window=("2024-05-08T00:00", "2024-05-26T00:00"),
         blurb="In May 2024 the Sun fired off its strongest storms in 20 years. On May 20 the "
               "Curiosity rover measured the biggest radiation surge of its whole mission."),
    dict(id="sep-2017", title="The September 2017 storm",
         donki=("2017-09-01", "2017-09-30"), radlab=("2017-09-06", "2017-09-18"),
         window=("2017-09-06T00:00", "2017-09-18T00:00"),
         blurb="In September 2017 a giant flare sent a storm across the solar system. Radiation "
               "on the surface of Mars more than doubled."),
    dict(id="recent", title="The Sun in the last 30 days",
         donki=("2026-10-15", "2026-11-14"), radlab=None,
         window=("2026-10-15T00:00", "2026-11-14T23:59"),
         blurb="The real Sun, right up to the day this snapshot was saved."),
]

DONKI_SOURCE = dict(
    id="donki",
    name="NASA DONKI - Space Weather Database Of Notifications, Knowledge, Information",
    provider="NASA Goddard Space Flight Center, Community Coordinated Modeling Center (CCMC) / "
             "Moon to Mars Space Weather Analysis Office",
    url="https://ccmc.gsfc.nasa.gov/tools/DONKI/",
    api="https://ccmc.gsfc.nasa.gov/DONKI/WS/get/",
    note="Flares (FLR), coronal mass ejections (CME) with WSA-ENLIL modelled arrival times at "
         "Mars, solar energetic particle events (SEP) and geomagnetic storms (GST).")
RADLAB_SOURCE = dict(
    id="radlab",
    name="NASA RadLab - Open Science Data Repository radiation dosimetry portal",
    provider="NASA Open Science Data Repository (OSDR), Ames Research Center",
    url="https://visualization.osdr.nasa.gov/radlab/",
    api="https://visualization.osdr.nasa.gov/radlab/api/",
    instrument="MSL-RAD-Surface: Radiation Assessment Detector on the Curiosity rover, Gale Crater, Mars",
    note="Absorbed dose rate in micrograys per hour, as published by RadLab. Binned here to hourly means.")


def load(path):
    with open(path) as f:
        return json.load(f)


def raw(raw_dir, typ, rng):
    name = "%s_%s_%s" % (typ, rng[0], rng[1])
    data = load(os.path.join(raw_dir, name + ".json"))
    meta = load(os.path.join(raw_dir, name + ".meta.json"))
    return data, meta


def flare_entry(f):
    cls = f.get("classType") or ""
    try:
        mag = float(cls[1:])
    except ValueError:
        mag = 0.0
    return dict(id=f["flrID"], begin=f.get("beginTime"), peak=f.get("peakTime"), end=f.get("endTime"),
                cls=cls, letter=cls[:1], mag=mag, region=f.get("activeRegionNum"),
                location=f.get("sourceLocation") or "", link=f.get("link"))


def cme_entry(c):
    analyses = c.get("cmeAnalyses") or []
    accurate = [a for a in analyses if a.get("isMostAccurate")] or analyses
    # DONKI can flag one "most accurate" analysis per measured feature. LE = the leading edge of
    # the CME itself (what we report as its speed); SH = the shock wave driven ahead of it.
    best = next((a for a in accurate if a.get("featureCode") == "LE"), accurate[0] if accurate else None)
    shock = next((a for a in accurate if a.get("featureCode") == "SH"), None)
    mars = None
    for an in accurate:
        for sim in an.get("enlilList") or []:
            for imp in sim.get("impactList") or []:
                if imp.get("location") == "Mars":
                    cand = (imp["arrivalTime"], bool(imp.get("isGlancingBlow")))
                    if mars is None or cand[0] < mars[0]:
                        mars = cand
    note = " ".join((c.get("note") or "").split())
    if len(note) > 220:
        note = note[:217].rsplit(" ", 1)[0] + "..."
    return dict(id=c["activityID"], start=c["startTime"],
                speed_kms=(best or {}).get("speed"), half_angle_deg=(best or {}).get("halfAngle"),
                type=(best or {}).get("type"), longitude_deg=(best or {}).get("longitude"),
                latitude_deg=(best or {}).get("latitude"),
                shock_speed_kms=(shock or {}).get("speed"),
                location=c.get("sourceLocation") or "", region=c.get("activeRegionNum"),
                mars_arrival=mars[0] if mars else None, mars_glancing=mars[1] if mars else None,
                linked=[l["activityID"] for l in (c.get("linkedEvents") or [])],
                note=note, link=c.get("link"))


def sep_entry(s):
    return dict(id=s["sepID"], time=s["eventTime"],
                instruments=[i["displayName"] for i in (s.get("instruments") or [])],
                linked=[l["activityID"] for l in (s.get("linkedEvents") or [])], link=s.get("link"))


def gst_entry(g):
    kps = [k["kpIndex"] for k in (g.get("allKpIndex") or [])]
    return dict(id=g["gstID"], start=g["startTime"], kp_max=max(kps) if kps else None, link=g.get("link"))


def radiation_block(raw_dir, rng):
    name = "MSL-RAD-Surface_%s_%s" % rng
    d = load(os.path.join(raw_dir, name + ".json"))
    meta = load(os.path.join(raw_dir, name + ".meta.json"))
    cols = d["columns"]
    it, ia = cols.index("timestamp"), cols.index("absorbed_dose_rate")
    samples = sorted((datetime.fromisoformat(r[it]), float(r[ia])) for r in d["data"] if r[ia] is not None)
    start = datetime.fromisoformat(rng[0])
    end = datetime.fromisoformat(rng[1])
    hours = int((end - start).total_seconds() // 3600)
    bins = [[] for _ in range(hours)]
    for t, v in samples:
        i = int((t - start).total_seconds() // 3600)
        if 0 <= i < hours:
            bins[i].append(v)
    hourly = [round(statistics.mean(b), 2) if b else None for b in bins]
    hourly_max = [round(max(b), 2) if b else None for b in bins]
    # Quiet-time baseline = median of the first 72 hours of the window (before the storm).
    quiet = [v for t, v in samples if t < start + timedelta(hours=72)]
    baseline = round(statistics.median(quiet), 2)
    peak_t, peak_v = max(samples, key=lambda s: s[1])
    # Level in the 24 h before the hour of the peak (can sit below the quiet baseline: Forbush decrease).
    peak_hour = peak_t.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
    before = [v for t, v in samples if peak_hour - timedelta(hours=24) <= t < peak_hour]
    pre_storm = round(statistics.mean(before), 2) if before else baseline
    # Dose actually delivered: trapezoid over the raw samples (gaps over 2 h are skipped).
    total = 0.0
    for (t0, v0), (t1, v1) in zip(samples, samples[1:]):
        dt = (t1 - t0).total_seconds() / 3600.0
        if dt <= 2.0:
            total += 0.5 * (v0 + v1) * dt
    lowest_day = None
    days = {}
    for t, v in samples:
        days.setdefault(t.strftime("%Y-%m-%d"), []).append(v)
    daily = [dict(date=k, mean=round(statistics.mean(v), 2), max=round(max(v), 2), n=len(v)) for k, v in sorted(days.items())]
    lowest_day = min(daily, key=lambda x: x["mean"])
    return dict(instrument_id="MSL-RAD-Surface", quantity="absorbed dose rate", unit="uGy/h",
                samples=len(samples), baseline=baseline, pre_storm=pre_storm,
                peak=dict(time=peak_t.strftime("%Y-%m-%dT%H:%M:%SZ"), value=round(peak_v, 2),
                          times_baseline=round(peak_v / baseline, 1),
                          times_pre_storm=round(peak_v / pre_storm, 1)),
                lowest_day=lowest_day, total_dose_uGy=round(total),
                baseline_dose_uGy_per_day=round(baseline * 24),
                hourly_start=start.strftime("%Y-%m-%dT%H:%MZ"), hourly_mean=hourly, hourly_max=hourly_max,
                daily=daily), meta


def build(raw_donki, raw_radlab, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    source_rows = []
    for tl in TIMELINES:
        flr, m1 = raw(raw_donki, "FLR", tl["donki"])
        cme, m2 = raw(raw_donki, "CME", tl["donki"])
        sep, m3 = raw(raw_donki, "SEP", tl["donki"])
        gst, m4 = raw(raw_donki, "GST", tl["donki"])
        metas = [m1, m2, m3, m4]
        flares = sorted((flare_entry(f) for f in flr), key=lambda x: x["peak"] or x["begin"])
        cmes = sorted((cme_entry(c) for c in cme), key=lambda x: x["start"])
        counts = dict(flares={k: sum(1 for f in flares if f["letter"] == k) for k in "XMCB"},
                      cmes=len(cmes), cmes_with_mars_arrival=sum(1 for c in cmes if c["mars_arrival"]),
                      seps=len(sep), geomagnetic_storms=len(gst))
        biggest = max(flares, key=lambda f: ("BCMX".find(f["letter"]), f["mag"])) if flares else None
        fastest = max((c for c in cmes if c["speed_kms"]), key=lambda c: c["speed_kms"], default=None)
        doc = dict(schema="plutonyx.timeline/1", id=tl["id"], title=tl["title"], blurb=tl["blurb"],
                   kind="archived",
                   retrieved_utc=max(m["retrieved_utc"] for m in metas),
                   donki_range=dict(start=tl["donki"][0], end=tl["donki"][1]),
                   window=dict(start=tl["window"][0] + "Z", end=tl["window"][1] + "Z"),
                   sources=[dict(DONKI_SOURCE, retrieved_utc=max(m["retrieved_utc"] for m in metas),
                                 requests=[m["source_url"] for m in metas])],
                   counts=counts,
                   highlights=dict(biggest_flare=biggest, fastest_cme=fastest),
                   flares=[f for f in flares if f["letter"] in "XM"],   # C/B flares are counted, not listed
                   cmes=cmes, seps=sorted((sep_entry(s) for s in sep), key=lambda x: x["time"]),
                   geomagnetic_storms=sorted((gst_entry(g) for g in gst), key=lambda x: x["start"]),
                   radiation=None)
        for m in metas:
            source_rows.append((tl["id"], "DONKI " + m["type"], m["source_url"], m["retrieved_utc"], m["records"]))
        if tl["radlab"]:
            rad, rmeta = radiation_block(raw_radlab, tl["radlab"])
            doc["radiation"] = rad
            doc["sources"].append(dict(RADLAB_SOURCE, retrieved_utc=rmeta["retrieved_utc"], requests=[rmeta["source_url"]]))
            source_rows.append((tl["id"], "RadLab MSL-RAD-Surface", rmeta["source_url"], rmeta["retrieved_utc"], rad["samples"]))
        path = os.path.join(out_dir, "timeline-%s.json" % tl["id"])
        with open(path, "w") as f:
            json.dump(doc, f, separators=(",", ":"))
        print("%-22s %6.1f KB  flares X%d M%d  CMEs %d (%d reach Mars)  SEP %d  GST %d%s" % (
            os.path.basename(path), os.path.getsize(path) / 1024.0, counts["flares"]["X"], counts["flares"]["M"],
            counts["cmes"], counts["cmes_with_mars_arrival"], counts["seps"], counts["geomagnetic_storms"],
            "  RAD peak %.0f uGy/h = %.0fx baseline" % (doc["radiation"]["peak"]["value"], doc["radiation"]["peak"]["times_baseline"]) if doc["radiation"] else ""))

    with open(os.path.join(out_dir, "SOURCES.md"), "w") as f:
        f.write("# Archived NASA data - sources\n\n"
                "These files are a **curated snapshot of real NASA data**, saved so the game is fully playable "
                "offline. They are labelled ARCHIVED in the game and are never shown as live.\n\n"
                "Rebuild with `tools/data/fetch_donki_raw.py`, `tools/data/fetch_radlab_raw.py` and "
                "`tools/data/build_snapshot.py` (see the header of each script).\n\n"
                "| Timeline | Dataset | Request URL | Retrieved (UTC) | Records |\n|---|---|---|---|---|\n")
        for row in source_rows:
            f.write("| %s | %s | %s | %s | %s |\n" % row)
        f.write("\n## Fields kept\n\n"
                "- **Flares (DONKI FLR):** flrID, beginTime, peakTime, endTime, classType, activeRegionNum, sourceLocation, link. "
                "M- and X-class flares are listed; C- and B-class are only counted.\n"
                "- **CMEs (DONKI CME):** activityID, startTime, sourceLocation, activeRegionNum, note (shortened), link; from the "
                "analysis marked `isMostAccurate`: speed, halfAngle, type, longitude, latitude; from its WSA-ENLIL runs: the "
                "earliest modelled arrival at **Mars** and whether it is a glancing blow.\n"
                "- **SEP / GST (DONKI):** id, time, instruments, linked events, link; for GST the highest Kp index.\n"
                "- **Radiation (RadLab):** `absorbed_dose_rate` (uGy/h) for `instrument_id=MSL-RAD-Surface`, binned to hourly "
                "mean and hourly max. `baseline` is the median of the first 72 hours of the window; `total_dose_uGy` is a "
                "trapezoid sum over the raw samples.\n\n"
                "## Credit\n\n"
                "DONKI is provided by the NASA GSFC Community Coordinated Modeling Center (CCMC) and the Moon to Mars Space "
                "Weather Analysis Office. RadLab is provided by the NASA Open Science Data Repository; MSL RAD data: "
                "NASA/JPL-Caltech/SwRI. Use of the data does not imply NASA endorsement.\n")
    print("wrote SOURCES.md")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    build(sys.argv[1], sys.argv[2], sys.argv[3])
