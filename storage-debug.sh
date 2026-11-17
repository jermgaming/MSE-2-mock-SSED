set -x
set -a
. .env
set +a
BASE="http://localhost:${GATEWAY_PORT:-8080}"
printf 'fake-image-bytes' > /tmp/ch-test.png
RESPONSE=$(curl -fs -X POST "$BASE/api/events/1/image" -F "image=@/tmp/ch-test.png;type=image/png")
echo "RESPONSE=$RESPONSE"
URL=$(echo "$RESPONSE" | sed -E 's/.*"url":"([^"]+)".*/\1/')
echo "EXTRACTED_URL=$URL"
curl -v "$BASE$URL"
