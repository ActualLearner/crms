#!/usr/bin/env bash
set -euo pipefail

# Bulk upload images to the CRMS API and optionally attach them to car records.
# Usage examples:
# 1) Upload all images in a folder and write mapping to output.csv
#    ./scripts/bulk_upload_images.sh --api http://127.0.0.1:8082 --dir ./images --out uploaded.csv
# 2) Upload and assign to cars when filenames include the car id (e.g. 42.jpg or car_42.png):
#    ./scripts/bulk_upload_images.sh --api http://127.0.0.1:8082 --dir ./images --out uploaded.csv --assign
# 3) Use a CSV mapping file with format "filename,car_id" to control assignments:
#    ./scripts/bulk_upload_images.sh --api http://127.0.0.1:8082 --dir ./images --map map.csv --out uploaded.csv --assign

API="http://127.0.0.1:8082"
DIR=""
OUT="uploaded_images.csv"
MAP=""
ASSIGN=0
EMAIL=""
PASS=""
COOKIEJAR="/tmp/crms_cookiejar_$$.txt"

usage(){
  echo "Usage: $0 --api API_BASE --dir IMAGEDIR [--out out.csv] [--assign] [--map map.csv] [--email admin@example.com --pass secret]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api) API="$2"; shift 2;;
    --dir) DIR="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    --map) MAP="$2"; shift 2;;
    --assign) ASSIGN=1; shift 1;;
    --email) EMAIL="$2"; shift 2;;
    --pass) PASS="$2"; shift 2;;
    -h|--help) usage;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

if [[ -z "$DIR" || ! -d "$DIR" ]]; then
  echo "Image directory missing or not a directory." >&2
  usage
fi

rm -f "$COOKIEJAR"

# If assign mode, attempt login (requires admin user credentials). If not provided, script will try without assigning.
if [[ $ASSIGN -eq 1 ]]; then
  if [[ -z "$EMAIL" || -z "$PASS" ]]; then
    echo "Assignment requested but no --email/--pass provided. Provide admin credentials to login." >&2
    exit 1
  fi

  echo "Logging in as $EMAIL to $API..."
  resp=$(curl -s -c "$COOKIEJAR" -b "$COOKIEJAR" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" "$API/auth/login") || true
  echo "Login response: $resp"
fi

echo "filename,uploaded_url,car_id" > "$OUT"

upload_file() {
  local file="$1"
  echo "Uploading $file..."
  # Use curl form upload
  local resp
  resp=$(curl -s -b "$COOKIEJAR" -c "$COOKIEJAR" -F "image=@$file" -F "type=car" "$API/upload/image") || return 1
  echo "$resp"
  # parse url from JSON (simple)
  local url
  url=$(echo "$resp" | sed -n 's/.*"url"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' || true)
  if [[ -z "$url" ]]; then
    echo "Failed to parse upload response for $file" >&2
    return 1
  fi
  echo "$url"
}

assign_image_to_car() {
  local car_id="$1"
  local url="$2"
  echo "Assigning image to car $car_id..."
  local payload
  payload=$(printf '{"image_url":"%s"}' "$url")
  curl -s -b "$COOKIEJAR" -c "$COOKIEJAR" -X PUT -H "Content-Type: application/json" -d "$payload" "$API/cars/$car_id" || return 1
}

# If a map CSV is provided, load it into an associative array
declare -A MAPTABLE
if [[ -n "$MAP" ]]; then
  while IFS=, read -r fname cid; do
    fname=$(echo "$fname" | xargs)
    cid=$(echo "$cid" | xargs)
    if [[ -n "$fname" && -n "$cid" ]]; then
      MAPTABLE["$fname"]="$cid"
    fi
  done < "$MAP"
fi

shopt -s nullglob
for img in "$DIR"/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}; do
  [ -e "$img" ] || continue
  filename=$(basename "$img")
  uploaded_url=$(upload_file "$img") || { echo "Upload failed for $img" >&2; continue; }

  car_id=""
  # Check map table first
  if [[ -n "${MAPTABLE[$filename]:-}" ]]; then
    car_id="${MAPTABLE[$filename]}"
  fi

  # If not mapped and assign mode, try to extract ID from filename (car_42.jpg or 42.jpg)
  if [[ -z "$car_id" && $ASSIGN -eq 1 ]]; then
    if [[ "$filename" =~ ([0-9]{1,6}) ]]; then
      car_id="${BASH_REMATCH[1]}"
    fi
  fi

  if [[ -n "$car_id" && $ASSIGN -eq 1 ]]; then
    assign_image_to_car "$car_id" "$uploaded_url"
  fi

  echo "$filename,$uploaded_url,$car_id" >> "$OUT"
done

echo "Done. Mapping written to $OUT"
exit 0
