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
