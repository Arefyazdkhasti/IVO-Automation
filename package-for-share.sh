#!/bin/bash
# ساخت ZIP آمادهٔ ارسال (بدون node_modules) — macOS / Linux
# استفاده: ./package-for-share.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
BASENAME="ivo-automation-share-${STAMP}"
STAGING="$(mktemp -d "${TMPDIR:-/tmp}/${BASENAME}.XXXXXX")"
DEST_DIR="${STAGING}/${BASENAME}"
OUT_ZIP="${ROOT}/${BASENAME}.zip"

INCLUDE_ENV=0
INCLUDE_USERS=1
USE_PASSWORD=1
WITH_NODE=0

bundle_windows_node() {
  local dest_root="$1"
  local version_file="${ROOT}/scripts/bundled-node.version"
  local version arch folder zip_name url tmp_zip extract_dir

  version="$(tr -d '[:space:]' < "$version_file")"
  arch="x64"
  folder="node-v${version}-win-${arch}"
  zip_name="${folder}.zip"
  url="https://nodejs.org/dist/v${version}/${zip_name}"
  tmp_zip="$(mktemp "${TMPDIR:-/tmp}/node-win.XXXXXX.zip")"
  extract_dir="${dest_root}/.ivo-runtime/_node_extract"

  echo "   ⬇️  دانلود Node.js ویندوز v${version} برای zip آفلاین…"
  curl -fsSL "$url" -o "$tmp_zip"
  mkdir -p "$extract_dir"
  unzip -q "$tmp_zip" -d "$extract_dir"
  rm -f "$tmp_zip"
  mkdir -p "${dest_root}/.ivo-runtime"
  rm -rf "${dest_root}/.ivo-runtime/node"
  mv "${extract_dir}/${folder}" "${dest_root}/.ivo-runtime/node"
  rm -rf "${dest_root}/.ivo-runtime/_node_extract"
  echo "   ✓ Node portable ویندوز داخل zip"
}

usage() {
  cat <<'EOF'
Usage: ./package-for-share.sh [options]

  --with-env      شامل کردن فایل .env (رمز و کلیدها — فقط برای گیرندهٔ مورد اعتماد)
  --with-node     Node.js ویندوز داخل zip (~50MB) — گیرنده بدون اینترنت/بدون npm
  --no-users      users.json داخل zip نمی‌رود
  --no-password   zip بدون رمز (سریع‌تر)
  -h, --help      راهنما
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --with-env) INCLUDE_ENV=1; shift ;;
    --with-node) WITH_NODE=1; shift ;;
    --no-users) INCLUDE_USERS=0; shift ;;
    --no-password) USE_PASSWORD=0; shift ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

if [ ! -f package.json ]; then
  echo "❌ package.json در این پوشه نیست. اسکریپت را از ریشهٔ پروژه اجرا کنید."
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "❌ rsync پیدا نشد. روی macOS معمولاً پیش‌فرض است."
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "❌ zip پیدا نشد."
  exit 1
fi

mkdir -p "$DEST_DIR"

RSYNC_EXCLUDES=(
  --exclude 'node_modules/'
  --exclude '.ivo-runtime/'
  --exclude '.git/'
  --exclude '.env'
  --exclude '.env.local'
  --exclude '.env.*.local'
  --exclude '*.zip'
  --exclude '.DS_Store'
  --exclude 'Thumbs.db'
  --exclude '.vscode/'
  --exclude '.idea/'
  --exclude 'test-results/'
  --exclude 'playwright-report/'
  --exclude 'blob-report/'
  --exclude 'playwright/.cache/'
  --exclude 'data/'
  --exclude 'screenshots/'
  --exclude 'captcha_*.png'
  --exclude 'temp_*.png'
  --exclude 'results/*.png'
  --exclude 'results/*.xlsx'
)

echo "📦 آماده‌سازی پوشهٔ موقت (بدون node_modules و .git)…"
rsync -a "${RSYNC_EXCLUDES[@]}" ./ "$DEST_DIR/"

if [ "$INCLUDE_ENV" -eq 1 ]; then
  if [ -f .env ]; then
    cp .env "$DEST_DIR/.env"
    echo "   ✓ .env اضافه شد"
  else
    echo "   ⚠️  --with-env زده بودید ولی .env وجود ندارد."
  fi
else
  echo "   ○ .env عمداً خارج شد (برای اشتراک امن). گیرنده از .env.example کپی می‌گیرد."
fi

if [ "$INCLUDE_USERS" -eq 0 ]; then
  rm -f "$DEST_DIR/users.json"
  echo "   ○ users.json حذف شد (--no-users)"
elif [ -f users.json ]; then
  echo "   ✓ users.json داخل zip است (شامل رمز ورود — فقط به گیرندهٔ مورد اعتماد بفرستید)"
fi

if [ "$WITH_NODE" -eq 1 ]; then
  bundle_windows_node "$DEST_DIR"
else
  echo "   ○ Node داخل zip نیست — اولین start.bat روی ویندوز خودش Node را دانلود می‌کند (--with-node برای آفلاین)"
fi

rm -f "$OUT_ZIP"

echo ""
echo "🗜  ساخت ${BASENAME}.zip …"

if [ "$USE_PASSWORD" -eq 1 ]; then
  echo "   (رمز zip را دو بار وارد کنید — Enter خالی = بدون رمز)"
  (
    cd "$STAGING"
    zip -er "$OUT_ZIP" "$BASENAME"
  )
else
  (
    cd "$STAGING"
    zip -r "$OUT_ZIP" "$BASENAME"
  )
fi

rm -rf "$STAGING"

SIZE="$(du -h "$OUT_ZIP" | awk '{print $1}')"

echo ""
echo "======================================================"
echo "✅ آماده است:"
echo "   $OUT_ZIP"
echo "   حجم تقریبی: $SIZE"
echo ""
echo "گیرنده (ویندوز خام): Extract → دوبار کلیک start.bat"
echo "   Mac → start.command (همچنان Node جدا لازم است)"
echo "======================================================"
