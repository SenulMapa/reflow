#!/usr/bin/env bash
# Capture ALL logs emitted BY the Reflow process (not just lines containing "Reflow").
# The crash is a fatal JS exception; RN's ExceptionsManager logs the JS error string +
# stack to the device console right before RCTFatal aborts. -p filters by PROCESS so we
# catch that line (an earlier -m "message match" filter wrongly dropped it).
# Plug in the iPhone, run this, THEN relaunch Reflow. Ctrl-C ~2s after it crashes.
set -uo pipefail
cd "$(dirname "$0")"

UDID="$(idevice_id -l 2>/dev/null | head -1)"
if [ -z "$UDID" ]; then
  echo "No device. Plug in the iPhone via USB, tap 'Trust', then rerun." >&2
  exit 1
fi

OUT="reflow-proc-log.txt"
echo "Capturing ALL Reflow-process logs to $OUT (device $UDID)."
echo ">>> Now RELAUNCH Reflow on the phone. Let it crash, then press Ctrl-C. <<<"
echo "----------------------------------------------------------------------"
# -p Reflow: only the app's own process logs (includes the RN JS error line + stack).
idevicesyslog -p Reflow --no-colors | tee "$OUT"
