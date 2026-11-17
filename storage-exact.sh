BASE="http://localhost:8080"
printf 'fake-image-bytes' > /tmp/ch-test.png
URL=$(curl -fs -X POST "$BASE/api/events/1/image" -F "image=@/tmp/ch-test.png;type=image/png" | sed -E 's/.*"url":"([^"]+)".*/\1/')
echo "URL=$URL"
curl -fs "$BASE$URL" | grep -q fake-image-bytes
echo "EXIT_CODE=$?"