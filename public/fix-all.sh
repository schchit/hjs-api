#!/bin/bash

# 1. 修复所有页面的导航翻译
cat > /tmp/nav-translations.js << 'JSEND'
<script>
const translations = {
    en: {
        nav_home: "Home", nav_product: "Product", nav_developers: "Developers",
        nav_console: "Console", nav_lookup: "Lookup", nav_billing: "Billing",
        nav_roi: "ROI", nav_governance: "Governance"
    },
    zh: {
        nav_home: "首页", nav_product: "产品", nav_developers: "开发者",
        nav_console: "控制台", nav_lookup: "查询", nav_billing: "计费",
        nav_roi: "ROI", nav_governance: "治理"
    }
};

function switchLang(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });
    const select = document.querySelector('select');
    if (select) select.value = lang;
}

(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    let lang;
    
    if (urlLang) {
        lang = urlLang;
        localStorage.setItem('hjs_lang', lang);
        const url = new URL(window.location);
        url.searchParams.delete('lang');
        window.history.replaceState({}, '', url);
    } else if (localStorage.getItem('hjs_lang')) {
        lang = localStorage.getItem('hjs_lang');
    } else {
        const browserLang = navigator.language || navigator.userLanguage;
        lang = browserLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
        localStorage.setItem('hjs_lang', lang);
    }
    
    switchLang(lang);
})();
</script>
JSEND

# 为每个页面添加脚本
for f in product.html developers.html console.html lookup.html billing.html governance.html cases.html roi-calculator.html; do
    if [ -f "$f" ]; then
        # 检查是否已有script标签
        if ! grep -q "const translations" "$f"; then
            # 在</body>前添加脚本
            sed -i '' "/<\/body>/e cat /tmp/nav-translations.js" "$f"
            echo "Added script to: $f"
        else
            echo "Already has script: $f"
        fi
    fi
done

echo "Done!"
