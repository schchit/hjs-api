#!/bin/bash
# HJS 自动部署脚本
# 需要配置 RENDER_API_KEY 环境变量

set -e

echo "🚀 HJS Auto Deploy Script"
echo "=========================="

# 检查必要环境变量
if [ -z "$RENDER_API_KEY" ]; then
    echo "❌ Error: RENDER_API_KEY not set"
    echo "Please set your Render API key:"
    echo "  export RENDER_API_KEY='rnd_xxxxxxxxxx'"
    echo ""
    echo "Get your API key from: https://dashboard.render.com/settings#api-keys"
    exit 1
fi

if [ -z "$RENDER_SERVICE_ID" ]; then
    echo "❌ Error: RENDER_SERVICE_ID not set"
    echo "Please set your service ID:"
    echo "  export RENDER_SERVICE_ID='srv-xxxxxxxxxx'"
    echo ""
    echo "Find it in your service URL: https://dashboard.render.com/web/srv-xxx"
    exit 1
fi

echo "📡 Triggering deployment..."

# 调用 Render API 触发部署
curl -X POST \
  "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": false}'

echo ""
echo "✅ Deploy triggered successfully!"
echo ""
echo "Monitor at: https://dashboard.render.com/web/$RENDER_SERVICE_ID"
echo ""
echo "Waiting 30 seconds for deployment to start..."
sleep 30

echo ""
echo "🧪 Testing deployment..."

# 测试健康检查
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.hjs.sh/health || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Health check passed"
    curl -s https://api.hjs.sh/health | head -1
else
    echo "⚠️  Health check returned $HEALTH_STATUS"
    echo "Check logs: https://dashboard.render.com/web/$RENDER_SERVICE_ID"
fi

echo ""
echo "🎉 Deployment complete!"
