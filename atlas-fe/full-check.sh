#!/bin/bash

echo "=== 1. Pod içindeki dosyalar ==="
kubectl exec -l app=atlas-fe -- ls -la /usr/share/nginx/html/ 2>/dev/null || echo "Pod yok veya erişilemiyor"

echo ""
echo "=== 2. Docker image'daki dosyalar ==="
docker run --rm atlas-fe:v1 ls -la /usr/share/nginx/html/ 2>/dev/null || echo "Image yok"

echo ""
echo "=== 3. Local dist klasörü ==="
ls -la /root/workspace/atlas/atlas-fe/dist/ 2>/dev/null || echo "dist yok"

echo ""
echo "=== 4. Service durumu ==="
kubectl get svc atlas-fe

echo ""
echo "=== 5. Pod durumu ==="
kubectl get pods -l app=atlas-fe

echo ""
echo "=== 6. Nginx error log ==="
kubectl exec -l app=atlas-fe -- cat /var/log/nginx/error.log 2>/dev/null | tail -10
