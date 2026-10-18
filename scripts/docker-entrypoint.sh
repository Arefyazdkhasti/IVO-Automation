#!/bin/sh
set -e

# Optional virtual display so Chromium can run headed inside Docker (still not visible
# in your desktop browser unless you add noVNC separately).
if [ "${PLAYWRIGHT_USE_XVFB}" = "true" ]; then
  export DISPLAY="${DISPLAY:-:99}"
  exec xvfb-run -a --server-args="-screen 0 1280x800x24" node server.js
fi

exec node server.js
