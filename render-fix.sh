#!/bin/bash
# Render 构建修复脚本

echo "🔧 Fixing Render Deployment"

# 确保文件存在并正确导出
echo "📦 Checking files..."
ls -la hjs-extension.js index.js

# 创建 .render-buildpacks.json 确保 Node 版本
cat > .render-buildpacks.json << 'EOF'
[
  "https://github.com/heroku/heroku-buildpack-nodejs"
]
EOF

# 确保 package.json 包含所有依赖
cat package.json | grep -E "(express|pg|cors|dotenv)"

echo "✅ Build fix prepared"
echo "Push this to trigger fresh deploy"
