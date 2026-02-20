#!/bin/bash

echo "🔧 开始修复所有页面的语言切换问题..."

# 进入 public 目录
cd public

# 备份所有文件
BACKUP_DIR="lang-fix-backup-$(date +%Y%m%d%H%M%S)"
mkdir -p $BACKUP_DIR
cp *.html $BACKUP_DIR/
echo "✅ 已备份所有文件到 $BACKUP_DIR"

# 更新 lang.js
cat > js/lang.js << 'LANGJS'
// ========== HJS Global Language Resolution Layer ==========
// 解析顺序（确定性）：
//   1. URL 参数 ?lang=
//   2. localStorage 中保存的偏好
//   3. 浏览器系统语言
//   4. 协议默认语言 (en)

(function() {
    const CONFIG = {
        DEFAULT_LANG: 'en',
        STORAGE_KEY: 'hjs_lang',
        SUPPORTED_LANGS: ['en', 'zh']
    };

    // 获取浏览器系统语言
    function getBrowserLang() {
        const navLang = navigator.language || navigator.userLanguage;
        if (navLang.startsWith('zh')) return 'zh';
        return CONFIG.DEFAULT_LANG;
    }

    function getLangFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const lang = params.get('lang');
        return CONFIG.SUPPORTED_LANGS.includes(lang) ? lang : null;
    }

    function getLangFromStorage() {
        const lang = localStorage.getItem(CONFIG.STORAGE_KEY);
        return CONFIG.SUPPORTED_LANGS.includes(lang) ? lang : null;
    }

    function resolveLang() {
        return getLangFromUrl() || getLangFromStorage() || getBrowserLang();
    }

    function persistLang(lang) {
        if (CONFIG.SUPPORTED_LANGS.includes(lang)) {
            localStorage.setItem(CONFIG.STORAGE_KEY, lang);
        }
    }

    function syncUrl(lang) {
        const url = new URL(window.location);
        if (url.searchParams.get('lang') !== lang) {
            url.searchParams.set('lang', lang);
            window.history.replaceState({}, '', url);
        }
    }

    function applyLang(lang) {
        if (typeof window.switchLang === 'function') {
            window.switchLang(lang);
        }
        
        // 更新所有语言选择下拉框
        document.querySelectorAll('select[onchange*="switchLang"]').forEach(select => {
            select.value = lang;
        });
    }

    const currentLang = resolveLang();
    persistLang(currentLang);
    syncUrl(currentLang);
    applyLang(currentLang);

    console.log(`[HJS] Language resolved: ${currentLang} (URL: ${getLangFromUrl()}, Storage: ${getLangFromStorage()}, Browser: ${getBrowserLang()})`);
})();
LANGJS

echo "✅ 已更新 js/lang.js"

# 处理每个 HTML 文件
for file in *.html; do
    echo "处理 $file ..."
    
    # 确保引用 lang.js
    if ! grep -q '<script src="/js/lang.js"></script>' "$file"; then
        sed -i '/<\/body>/i <script src="/js/lang.js"></script>' "$file"
    fi
    
    # 检查是否有 switchLang 函数，如果没有则添加标准版本
    if ! grep -q 'function switchLang' "$file"; then
        # 在文件末尾添加标准 switchLang 函数
        cat >> "$file" << 'SWITCH'

<script>
// 标准语言切换函数
function switchLang(lang) {
    // 这里应该由每个页面自己的 translations 对象驱动
    // 如果页面有自己的 translations，会覆盖这个函数
    console.log('Language switched to:', lang);
    
    // 更新下拉菜单
    const selects = document.querySelectorAll('select[onchange*="switchLang"]');
    selects.forEach(select => select.value = lang);
    
    // 更新 HTML lang 属性
    document.documentElement.lang = lang;
}

// 确保 translations 对象存在
window.translations = window.translations || {
    en: {},
    zh: {}
};
</script>
SWITCH
    fi
    
    echo "✅ $file 处理完成"
done

echo "🎉 所有页面修复完成！"
echo "请检查以下文件是否正常："
ls -la *.html
