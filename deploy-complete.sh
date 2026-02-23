#!/bin/bash
# HJS Protocol - Complete Deployment Script
# Handles network issues with GitHub mirror

set -e

echo "🚀 HJS Protocol Complete Deployment"
echo "===================================="

# Configure GitHub mirror for slow network
echo "📡 Configuring GitHub mirror..."
git config --global url."https://ghproxy.com/https://github.com/".insteadOf "https://github.com/" 2>/dev/null || true
git config --global url."https://mirror.ghproxy.com/https://github.com/".insteadOf "https://github.com/" 2>/dev/null || true

# Alternative: Use SSH if available
if [ -f ~/.ssh/id_rsa ] || [ -f ~/.ssh/id_ed25519 ]; then
    echo "🔑 SSH key found, using SSH..."
    git remote set-url origin git@github.com:schchit/hjs-api.git 2>/dev/null || true
fi

# Check status
echo ""
echo "📊 Repository Status:"
git status --short

# Check what files changed
echo ""
echo "📁 Changed files:"
git diff --name-only

# Commit if needed
if ! git diff --cached --quiet; then
    echo ""
    echo "📝 Committing changes..."
    git commit -m "Optimize: Performance, SEO, API docs, and Protocol Core

Performance:
- Add gzip compression middleware
- Add cache headers (5min API, 1day static)
- Optimize static file serving

SEO & Meta:
- Add comprehensive meta tags (description, keywords, OG)
- Add canonical URL and theme-color
- Improve page titles

API Improvements:
- Add /health endpoint for monitoring
- Add /api/docs with complete endpoint documentation
- Add /docs redirect to /api/docs
- Better footer links (GitHub, Spec, License)

Protocol Core:
- Delegation API (POST/GET /delegations)
- Termination API (POST/GET /terminations)
- Verification API (POST /verify, /verifications)
- Copy-to-clipboard for API keys

Links: https://github.com/schchit/hjs-api"
fi

# Push with retry
echo ""
echo "⬆️  Pushing to GitHub..."
for i in 1 2 3; do
    echo "  Attempt $i..."
    if git push origin main; then
        echo "✅ Push successful!"
        break
    else
        echo "  ⚠️  Push failed, retrying..."
        sleep 3
    fi
done

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "Next steps:"
echo "  1. Check your site: https://humanjudgment.services"
echo "  2. Test API: curl https://humanjudgment.services/health"
echo "  3. View docs: https://humanjudgment.services/api/docs"
echo ""
echo "If auto-deploy is enabled, changes will be live in 1-2 minutes."
