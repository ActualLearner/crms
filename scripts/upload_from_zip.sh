#!/usr/bin/env bash
set -euo pipefail

# Extract a ZIP of car images (and optional mapping file) and upload them using bulk_upload_images.sh
# Usage:
#   ./scripts/upload_from_zip.sh --zip cars.zip --api http://127.0.0.1:8082 --out result.csv --assign --email admin@x --pass secret

ZIPFILE=""
API="http://127.0.0.1:8082"
OUT="uploaded_from_zip.csv"
ASSIGN=0
EMAIL=""
PASS=""
MAP=""

usage(){
  echo "Usage: $0 --zip FILE.zip [--api API_BASE] [--out out.csv] [--assign] [--map map.csv] [--email admin@example.com --pass secret]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --zip) ZIPFILE="$2"; shift 2;;
    --api) API="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    --assign) ASSIGN=1; shift 1;;
    --map) MAP="$2"; shift 2;;
    --email) EMAIL="$2"; shift 2;;
    --pass) PASS="$2"; shift 2;;
    -h|--help) usage;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

if [[ -z "$ZIPFILE" || ! -f "$ZIPFILE" ]]; then
  echo "ZIP file missing or not found." >&2
  usage
fi

TMPDIR=$(mktemp -d)
cleanup(){ rm -rf "$TMPDIR"; }
trap cleanup EXIT

echo "Extracting $ZIPFILE to $TMPDIR..."
unzip -q "$ZIPFILE" -d "$TMPDIR"

# If the zip contains a mapping file named map.csv or mapping.csv, use it unless --map was provided
if [[ -z "$MAP" ]]; then
  if [[ -f "$TMPDIR/map.csv" ]]; then
    MAP="$TMPDIR/map.csv"
  elif [[ -f "$TMPDIR/mapping.csv" ]]; then
    MAP="$TMPDIR/mapping.csv"
  fi
fi

echo "Calling bulk uploader for directory: $TMPDIR"

CMD=("$(dirname "$0")/bulk_upload_images.sh" --api "$API" --dir "$TMPDIR" --out "$OUT")
if [[ -n "$MAP" ]]; then
  CMD+=(--map "$MAP")
fi
if [[ $ASSIGN -eq 1 ]]; then
  CMD+=(--assign --email "$EMAIL" --pass "$PASS")
fi

echo "Running: ${CMD[*]}"
"${CMD[@]}"

echo "Upload finished. Mapping saved to $OUT"
exit 0
