#!/bin/bash
# اجرای محلی IVO Automation — دوبار کلیک در macOS یا: chmod +x start.command && ./start.command

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PORT="${PORT:-3002}"
HOST="${HOST:-127.0.0.1}"
URL="http://localhost:${PORT}"

echo "======================================================"
echo "  IVO Automation — اجرای محلی"
echo "======================================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js نصب نیست."
  echo "   از https://nodejs.org نسخه ۱۸ یا بالاتر (ترجیحاً ۲۴) را نصب کنید."
  echo ""
  read -r -p "Enter را بزنید تا پنجره بسته شود…" _
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "⚠️  Node.js شما قدیمی است (نسخه $(node -v)). نسخه ۱۸+ توصیه می‌شود."
fi

if [ ! -f .env ]; then
  echo "⚠️  فایل .env پیدا نشد. از .env.example یک کپی بسازید و Supabase و سایر تنظیمات را پر کنید."
  echo ""
fi

if [ ! -d node_modules ]; then
  echo "📦 نصب وابستگی‌ها (npm install)…"
  npm install
  echo ""
  echo "🌐 نصب مرورگر Chromium برای Playwright…"
  npx playwright install chromium
  echo ""
elif ! compgen -G "${HOME}/Library/Caches/ms-playwright/chromium-"* >/dev/null 2>&1; then
  echo "🌐 مرورگر Playwright یافت نشد؛ در حال نصب Chromium…"
  npx playwright install chromium
  echo ""
fi

export PORT HOST

open_browser_when_ready() {
  local i=0
  while [ "$i" -lt 60 ]; do
    if curl -sf -o /dev/null "${URL}/" 2>/dev/null; then
      open "${URL}"
      return 0
    fi
    sleep 0.25
    i=$((i + 1))
  done
  echo "⚠️  سرور دیر بالا آمد؛ خودتان ${URL} را در مرورگر باز کنید."
}

open_browser_when_ready &
BROWSER_HELPER_PID=$!

cleanup() {
  kill "${BROWSER_HELPER_PID}" 2>/dev/null || true
  if [ -n "${SERVER_PID:-}" ]; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "🚀 راه‌اندازی سرور روی ${HOST}:${PORT}"
echo "   برای توقف، این پنجره ترمینال را ببندید یا Ctrl+C بزنید."
echo ""

npm start &
SERVER_PID=$!
wait "${SERVER_PID}"
