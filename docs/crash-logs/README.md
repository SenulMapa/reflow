# Reflow crash-log capture

The `.ips` files iOS writes for this app **do not contain the JavaScript error string** —
they bottom out in whisper.rn's ggml `std::set_terminate` handler
(`wsp_ggml_uncaught_exception → abort()`), which masks whatever actually threw. Every
failed launch-crash fix (v1.0.1–v1.0.8) was reverse-engineered from those masked native
stacks. The reliable way to see the **real** error is the live device syslog.

## Live syslog over USB (Linux — this repo's dev box)

`libimobiledevice` (1.4.0) is installed; `usbmuxd` runs on demand.

```bash
# 1. Plug the iPhone into this machine via USB. Tap "Trust This Computer" if prompted.
idevice_id -l                          # should print the device UDID
ideviceinfo | grep -i ProductVersion   # note the iOS version

# 2. Start the capture (writes to a timestamped file here), THEN relaunch Reflow:
bash docs/crash-logs/capture.sh
```

The capture filters for `reflow|fatal|exception|abort|RCTFatal|redbox|JS`. The line you
want looks like a JS error, e.g. `Error: <message>` with a JS stack, or
`Unhandled JS Exception: ...` right before the abort. Save that file — commit it here so
the ground truth is never lost again (past logs lived only in `~/Downloads`).

## The `.ips` (secondary — keep for symbolication once CI exports dSYMs)

Settings → Privacy & Security → Analytics & Improvements → Analytics Data →
newest `Reflow-*` (real crash, `bug_type 309`) or `JetsamEvent-*` (memory kill). AirDrop /
copy it into this folder alongside the syslog.

## Mac alternative

Console.app (select the device, filter "Reflow") or Xcode → Window → Devices &
Simulators → View Device Logs. Same live-error visibility as `idevicesyslog`.
