import re
import os

files = ['index.html', 'product.html', 'developers.html', 'console.html', 
         'lookup.html', 'billing.html', 'governance.html', 'cases.html']

# 统一的导航栏样式（添加到<style>中）
nav_styles = '''
        /* 统一导航栏样式 */
        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 1.5rem;
            padding-bottom: 1.5rem;
        }
        nav a:first-child {
            font-size: 1.125rem;
            font-weight: 600;
            color: white;
            flex-shrink: 0;
            text-decoration: none;
        }
        nav .nav-links {
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }
        @media (min-width: 768px) {
            nav .nav-links {
                gap: 2rem;
            }
        }
        nav .nav-link {
            color: #9ca3af;
            font-size: 1rem;
            text-decoration: none;
            transition: color 0.2s;
            white-space: nowrap;
        }
        nav .nav-link:hover {
            color: #5ee0c0;
        }
        nav .nav-link.active {
            color: white;
        }
        nav select {
            background: transparent;
            color: #9ca3af;
            font-size: 0.75rem;
            border: none;
            cursor: pointer;
            flex-shrink: 0;
            margin-left: 1rem;
        }
'''

# 根据当前页面确定哪个链接应该是active
def get_active_link(filename):
    mapping = {
        'index.html': 'nav_home',
        'product.html': 'nav_product',
        'developers.html': 'nav_developers',
        'console.html': 'nav_console',
        'lookup.html': 'nav_lookup',
        'billing.html': 'nav_billing',
        'governance.html': 'nav_governance',
        'cases.html': 'nav_home'  # cases没有独立导航，指向home
    }
    return mapping.get(filename, 'nav_home')

for filename in files:
    filepath = os.path.join('.', filename)
    if not os.path.exists(filepath):
        print(f"Skip: {filename}")
        continue
        
    with open(filepath, 'r') as f:
        content = f.read()
    
    # 检查是否已有统一导航样式
    if '/* 统一导航栏样式 */' in content:
        print(f"Already updated: {filename}")
        continue
    
    # 添加导航样式到<style>
    content = content.replace('</style>', nav_styles + '</style>')
    
    # 替换导航栏HTML
    active_link = get_active_link(filename)
    
    new_nav = f'''        <!-- 导航栏 -->
        <nav>
            <a href="/">HJS</a>
            <div class="nav-links">
                <a href="/" class="nav-link{' active' if active_link == 'nav_home' else ''}" data-i18n="nav_home">Home</a>
                <a href="/product.html" class="nav-link{' active' if active_link == 'nav_product' else ''}" data-i18n="nav_product">Product</a>
                <a href="/developers.html" class="nav-link{' active' if active_link == 'nav_developers' else ''}" data-i18n="nav_developers">Developers</a>
                <a href="/console.html" class="nav-link{' active' if active_link == 'nav_console' else ''}" data-i18n="nav_console">Console</a>
                <a href="/lookup.html" class="nav-link{' active' if active_link == 'nav_lookup' else ''}" data-i18n="nav_lookup">Lookup</a>
                <a href="/billing.html" class="nav-link{' active' if active_link == 'nav_billing' else ''}" data-i18n="nav_billing">Billing</a>
                <a href="/roi-calculator.html" class="nav-link" data-i18n="nav_roi">ROI</a>
                <a href="/governance.html" class="nav-link{' active' if active_link == 'nav_governance' else ''}" data-i18n="nav_governance">Governance</a>
            </div>
            <select onchange="switchLang(this.value)">
                <option value="en">EN</option>
                <option value="zh">中文</option>
            </select>
        </nav>
'''
    
    # 替换旧导航栏（匹配多种可能的格式）
    nav_pattern = r'<div class="flex justify-between items-center py-6[^"]*">[\s\S]*?</select>'
    content = re.sub(nav_pattern, new_nav.strip(), content)
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✓ Updated: {filename}")

print("\nAll navigation bars unified!")
