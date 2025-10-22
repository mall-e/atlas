#!/bin/bash

# k3s için Deployment Script
# Bu script Docker image'ı containerd'ye import eder ve deploy eder

echo "🚀 Auth Service - k3s Deployment Başlatılıyor..."

# 1. Docker image build et
echo "📦 Docker image build ediliyor..."
docker build -t authservice:latest .

if [ $? -ne 0 ]; then
    echo "❌ Docker build başarısız!"
    exit 1
fi

echo "✅ Docker image başarıyla oluşturuldu"

# 2. Docker image'ı direkt containerd'ye import et (pipe ile)
echo "📥 Image containerd'ye import ediliyor..."
docker save authservice:latest | sudo k3s ctr images import -

if [ $? -ne 0 ]; then
    echo "❌ containerd import başarısız!"
    exit 1
fi

echo "✅ Image containerd'ye import edildi"

# 3. containerd'deki image'ları listele (doğrulama)
echo "📋 containerd'deki image'lar:"
sudo k3s ctr images ls | grep authservice

# 4. Eski deployment varsa sil
echo "🧹 Eski deployment temizleniyor..."
kubectl delete -f deployment.yaml 2>/dev/null || true
sleep 2

# 5. Kubernetes'e deploy et
echo "🚢 Kubernetes'e deploy ediliyor..."
kubectl apply -f deployment.yaml

if [ $? -ne 0 ]; then
    echo "❌ Kubernetes deployment başarısız!"
    exit 1
fi

echo "✅ Deployment başarılı!"

# 6. Pod'ların durumunu kontrol et
echo ""
echo "⏳ Pod'lar başlatılıyor (10 saniye bekleniyor)..."
sleep 10

echo ""
echo "📊 Pod Durumu:"
kubectl get pods -l app=authservice

echo ""
echo "📊 Service Durumu:"
kubectl get svc authservice

echo ""
echo "✅ Deployment tamamlandı!"
echo ""
echo "Test etmek için:"
echo "  kubectl port-forward svc/authservice 8080:80"
echo ""
echo "Sonra başka bir terminalde:"
echo '  curl -X POST http://localhost:8080/register -H "Content-Type: application/json" -d '"'"'{"username":"test","password":"123"}'"'"