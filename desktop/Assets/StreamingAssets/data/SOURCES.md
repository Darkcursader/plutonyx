# Archived NASA data - sources

These files are a **curated snapshot of real NASA data**, saved so the game is fully playable offline. They are labelled ARCHIVED in the game and are never shown as live.

Rebuild with `tools/data/fetch_donki_raw.py`, `tools/data/fetch_radlab_raw.py` and `tools/data/build_snapshot.py` (see the header of each script).

| Timeline | Dataset | Request URL | Retrieved (UTC) | Records |
|---|---|---|---|---|
| may-2024 | DONKI FLR | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2024-05-01&endDate=2024-05-31 | 2026-11-14T10:41:14Z | 181 |
| may-2024 | DONKI CME | https://api.nasa.gov/DONKI/CME?startDate=2024-05-01&endDate=2024-05-31 | 2026-11-14T10:39:19Z | 144 |
| may-2024 | DONKI SEP | https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-05-31 | 2026-11-14T10:38:43Z | 14 |
| may-2024 | DONKI GST | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/GST?startDate=2024-05-01&endDate=2024-05-31 | 2026-11-14T10:41:46Z | 5 |
| may-2024 | RadLab MSL-RAD-Surface | https://visualization.osdr.nasa.gov/radlab/api/?instrument_id=MSL-RAD-Surface&spacecraft&trajectory&celestial_body&absorbed_dose_rate&dose_equivalent_rate&flux&timestamp%3E=2024-05-08&timestamp%3C2024-05-26&format=json | 2026-11-14T10:58:40Z | 1568 |
| sep-2017 | DONKI FLR | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2017-09-01&endDate=2017-09-30 | 2026-11-14T10:41:16Z | 41 |
| sep-2017 | DONKI CME | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/CME?startDate=2017-09-01&endDate=2017-09-30 | 2026-11-14T10:41:17Z | 29 |
| sep-2017 | DONKI SEP | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP?startDate=2017-09-01&endDate=2017-09-30 | 2026-11-14T10:41:18Z | 10 |
| sep-2017 | DONKI GST | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/GST?startDate=2017-09-01&endDate=2017-09-30 | 2026-11-14T10:41:19Z | 4 |
| sep-2017 | RadLab MSL-RAD-Surface | https://visualization.osdr.nasa.gov/radlab/api/?instrument_id=MSL-RAD-Surface&spacecraft&trajectory&celestial_body&absorbed_dose_rate&dose_equivalent_rate&flux&timestamp%3E=2017-09-06&timestamp%3C2017-09-18&format=json | 2026-11-14T10:58:35Z | 1058 |
| recent | DONKI FLR | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2026-10-15&endDate=2026-11-14 | 2026-11-14T10:41:21Z | 13 |
| recent | DONKI CME | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/CME?startDate=2026-10-15&endDate=2026-11-14 | 2026-11-14T10:41:26Z | 86 |
| recent | DONKI SEP | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP?startDate=2026-10-15&endDate=2026-11-14 | 2026-11-14T10:41:27Z | 0 |
| recent | DONKI GST | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/GST?startDate=2026-10-15&endDate=2026-11-14 | 2026-11-14T10:41:31Z | 1 |

## Fields kept

- **Flares (DONKI FLR):** flrID, beginTime, peakTime, endTime, classType, activeRegionNum, sourceLocation, link. M- and X-class flares are listed; C- and B-class are only counted.
- **CMEs (DONKI CME):** activityID, startTime, sourceLocation, activeRegionNum, note (shortened), link; from the analysis marked `isMostAccurate`: speed, halfAngle, type, longitude, latitude; from its WSA-ENLIL runs: the earliest modelled arrival at **Mars** and whether it is a glancing blow.
- **SEP / GST (DONKI):** id, time, instruments, linked events, link; for GST the highest Kp index.
- **Radiation (RadLab):** `absorbed_dose_rate` (uGy/h) for `instrument_id=MSL-RAD-Surface`, binned to hourly mean and hourly max. `baseline` is the median of the first 72 hours of the window; `total_dose_uGy` is a trapezoid sum over the raw samples.

## Credit

DONKI is provided by the NASA GSFC Community Coordinated Modeling Center (CCMC) and the Moon to Mars Space Weather Analysis Office. RadLab is provided by the NASA Open Science Data Repository; MSL RAD data: NASA/JPL-Caltech/SwRI. Use of the data does not imply NASA endorsement.
