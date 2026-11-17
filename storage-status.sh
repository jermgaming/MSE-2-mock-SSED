BASE='http://localhost:8080'
printf 'fake-image-bytes' > /tmp/ch-test.png
curl -sS -w '\nHTTP_CODE=%{http_code}\n' -X POST "$BASE/api/events/1/image" -F "image=@/tmp/ch-test.png;type=image/png"