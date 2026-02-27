import os
import sqlite3
import re
import logging
import argparse
from readmdict import MDX

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

PROJECT_NAME = 'medce'
MDX_FILE_EN = 'dorland32.mdx'
MDX_FILE_ZH = 'medce.mdx'
WWW_DIR = ''
DB_FILE = ''
PHP_FILE = ''
INDEX_FILE = ''
BROWSER_FILE = ''
HTACCESS_FILE = ''


def setup_config(base_dir):
    global WWW_DIR, DB_FILE, PHP_FILE, INDEX_FILE, BROWSER_FILE, HTACCESS_FILE
    
    if not base_dir:
        base_dir = '.'
        
    WWW_DIR = os.path.join(base_dir, PROJECT_NAME)
    DB_FILE = os.path.join(WWW_DIR, f'{PROJECT_NAME}.db')
    PHP_FILE = os.path.join(WWW_DIR, 'search.php')
    INDEX_FILE = os.path.join(WWW_DIR, 'index.html')
    BROWSER_FILE = os.path.join(WWW_DIR, 'browser.html')
    HTACCESS_FILE = os.path.join(WWW_DIR, '.htaccess')
    
    print(f"Output directory set to: {os.path.abspath(WWW_DIR)}")
    print(f"Database file set to: {os.path.abspath(DB_FILE)}")


def clean_dorland(html):
    if not html: return ""
    # 1. 移除 XML 声明和 CSS 引用
    html = re.sub(r'<\?xml.*?\?>|<!DOCTYPE.*?>', '', html, flags=re.I)
    html = re.sub(r'<link.*?>|<script.*?>.*?</script>', '', html, flags=re.DOTALL | re.I)
    # 2. 协议转换 entry://word -> javascript:search('word')
    def escape_js_string(match):
        word = match.group(1)
        escaped_word = word.replace('\\', '\\\\').replace("'", "\\'")
        return f'href="javascript:search(\'{escaped_word}\')"'
    html = re.sub(r'href="entry://([^"]+)"', escape_js_string, html)
    # 3. 处理 blockquote (子词条)
    html = re.sub(r'<p>\s*Sub Entries:<br\s*/?>', '', html, flags=re.I)
    html = html.replace('<blockquote>', '<div class="sub-entries"><span class="sub-label">Related terms:</span><br>')
    html = html.replace('</blockquote>', '</div>')
    # 4. 主词条 (Main Entry) 脚注化
    html = re.sub(r'(Main Entry:\s*)(<a href=.*?</a>)', 
                  r'<div class="main-entry-ref"><span class="ref-text">查看主词条:</span> \2</div>', html)
    # 5. 图片路径转换
    html = re.sub(r'src="file://dorland/([^"]+)"', r'src="images/\1"', html)
    html = re.sub(r'src="file://([^"]+)"', r'src="images/\1"', html)
    # 6. 细节清理
    html = html.replace('&nbsp;', ' ').replace('\r\n', '\n')
    return html.strip()


def clean_medce(html):
    if not html: return ""
    # 1. 修正医学生僻字与移除旧标签
    html = html.replace('☀', '𧿹')
    html = re.sub(r'<(/?font|/?b|/?i)[^>]*>', '', html)
    # 2. 转换 `1` `2` `3` 结构
    if '`2`' not in html:
        match = re.search(r'`1`(.*?)(?=`3`|<br>|$)', html, flags=re.S)
        if match:
            word = match.group(1)
            match3 = re.search(r'`3`(.*)', html, flags=re.S)
            if match3:
                trans = match3.group(1)
                html = f'<div class="zh-hw">{word}</div><div class="zh-trans">{trans}</div>'
            else:
                html = f'<div class="zh-hw">{word}</div>'
    else:
        html = re.sub(r'`1`(.*?)(?=`2`|`3`|<br>|$)', r'<div class="zh-hw">\1</div>', html, flags=re.S)
        html = re.sub(r'`2`(.*?)(?=`3`|<br>|$)', r'<div class="zh-phonetic">\1</div>', html, flags=re.S)
        html = re.sub(r'`3`(.*)', r'<div class="zh-trans">\1</div>', html, flags=re.S)
    # 3. 清理换行和二进制垃圾
    html = html.replace('<br><hr>', '').replace('\x00', '').strip()
    return html


def convert_mdx_to_sqlite():
    print(f"Converting {MDX_FILE_EN} and {MDX_FILE_ZH} to SQLite database...")
    
    os.makedirs(WWW_DIR, exist_ok=True)
    
    if os.path.exists(DB_FILE):
        print(f"Removing existing database: {DB_FILE}")
        try:
            os.remove(DB_FILE)
        except PermissionError:
            print(f"Error: Cannot remove {DB_FILE}. It might be in use.")
            return

    if not os.path.exists(MDX_FILE_EN) or not os.path.exists(MDX_FILE_ZH):
        print(f"Error: MDX files not found in the current directory.")
        return

    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('DROP TABLE IF EXISTS entries')
        cursor.execute('CREATE TABLE entries (word TEXT PRIMARY KEY, html_zh TEXT, html_en TEXT)')

        def process_dict(mdx_path, column):
            try:
                logging.info(f"正在读取 {mdx_path}...")
                mdx = MDX(mdx_path)
                total = len(mdx)
                logging.info(f"共 {total} 个词条")
                
                for i, (key, value) in enumerate(mdx.items()):
                    try:
                        word = key.decode('utf-8').strip()
                        raw = value.decode('utf-8', errors='ignore').strip()
                        
                        content = raw if raw.startswith('@@@LINK=') else (clean_dorland(raw) if column == 'html_en' else clean_medce(raw))

                        cursor.execute(f"SELECT {column} FROM entries WHERE word=?", (word,))
                        row = cursor.fetchone()
                        if not row:
                            cursor.execute(f"INSERT INTO entries (word, {column}) VALUES (?, ?)", (word, content))
                        else:
                            existing = row[0]
                            if existing and existing.startswith('@@@LINK=') and not content.startswith('@@@LINK='):
                                cursor.execute(f"UPDATE entries SET {column}=? WHERE word=?", (content, word))
                            elif not existing:
                                cursor.execute(f"UPDATE entries SET {column}=? WHERE word=?", (content, word))
                        
                        if (i + 1) % 1000 == 0:
                            logging.info(f"已处理 {i + 1}/{total} 个词条")
                    except Exception as e:
                        logging.error(f"处理词条 {key} 时出错: {e}")
                        continue
            except Exception as e:
                logging.error(f"处理词典 {mdx_path} 时出错: {e}")

        process_dict(MDX_FILE_EN, 'html_en')
        process_dict(MDX_FILE_ZH, 'html_zh')
        conn.commit()
        conn.close()
        logging.info(f"✅ 转换完成，已生成 {DB_FILE}")
        
        validate_data()
    except Exception as e:
        logging.error(f"转换过程中出错: {e}")
        if 'conn' in locals():
            conn.close()


def validate_data():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM entries')
    total = cursor.fetchone()[0]
    logging.info(f"数据库共有 {total} 个词条")
    
    cursor.execute('SELECT COUNT(*) FROM entries WHERE html_zh IS NOT NULL AND html_zh != ""')
    zh_count = cursor.fetchone()[0]
    logging.info(f"有中文解释的词条: {zh_count}")
    
    cursor.execute('SELECT COUNT(*) FROM entries WHERE html_en IS NOT NULL AND html_en != ""')
    en_count = cursor.fetchone()[0]
    logging.info(f"有英文解释的词条: {en_count}")
    
    cursor.execute('SELECT COUNT(*) FROM entries WHERE html_zh IS NOT NULL AND html_zh != "" AND html_en IS NOT NULL AND html_en != ""')
    both_count = cursor.fetchone()[0]
    logging.info(f"同时有中英文解释的词条: {both_count}")
    
    conn.close()


def create_search_php():
    """生成 search.php 后端搜索接口"""
    print(f"Creating {PHP_FILE}...")
    
    php_content = """<?php
$word = $_GET['q'] ?? '';
$db = new PDO('sqlite:' . __DIR__ . '/medce.db');

// 统一处理输出转义
function h($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

function resolve($db, $content, $column) {
    $depth = 0;
    while (strpos($content, '@@@LINK=') === 0 && $depth < 3) {
        $target = trim(substr($content, 8));
        $stmt = $db->prepare("SELECT $column FROM entries WHERE word = :w COLLATE NOCASE");
        $stmt->execute([':w' => $target]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row && !empty($row[$column])) {
            $content = $row[$column];
        } else {
            // 安全地生成跳转链接
            // 使用 json_encode 确保 JS 参数绝对安全
            $js_param = json_encode($target, JSON_UNESCAPED_UNICODE);
            return "请参考: <a href='javascript:search($js_param)'>" . h($target) . "</a>";
        }
        $depth++;
    }
    return $content;
}

$stmt = $db->prepare("SELECT html_zh, html_en FROM entries WHERE word = :w COLLATE NOCASE LIMIT 1");
$stmt->execute([':w' => $word]);
$res = $stmt->fetch(PDO::FETCH_ASSOC);

if ($res) {
    echo '<div class="card">';
    
    // 处理中文
    if (!empty($res['html_zh'])) {
        $zh = resolve($db, $res['html_zh'], 'html_zh');
        echo "<div class='section'><span class='tag'>英汉医学大词典</span>$zh</div>";
    }

    if (!empty($res['html_zh']) && !empty($res['html_en'])) {
        echo '<div class="divider"></div>';
    }

    // 处理英文
    if (!empty($res['html_en'])) {
        $en = resolve($db, $res['html_en'], 'html_en');
        echo "<div class='section'><span class='tag'>Dorland's Medical Dictionary</span>$en</div>";
    }
    
    echo '</div>';
} else {
    echo "<div class='card' style='padding:20px; text-align: center;'>未找到: " . h($word) . "</div>";
}
"""
    
    with open(PHP_FILE, 'w', encoding='utf-8') as f:
        f.write(php_content)


def create_index_html():
    """生成用于 iframe 嵌入的 index.html"""
    print(f"Creating {INDEX_FILE}...")
    
    html_content = """<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>医学双语词典</title>
<link rel="icon" href="medce.png" type="image/png">
    <link rel="stylesheet" href="medce.css">
    <style>

        html { height: 100%; width: 100%; margin: 0; padding: 0; }
        body { 
            font-family: sans-serif; 
            margin: 0; 
            padding: 0; 
            display: flex; 
            flex-direction: column; 
            height: 100%; 
            width: 100%;
            box-sizing: border-box; 
            overflow: hidden; /* Prevent body scroll */
        }
        /* Search box removed as requested */
        #content { 
            flex: 1; 
            border: none; 
            padding: 0; 
            overflow-y: auto; 
            overflow-x: hidden;
            position: relative; 
            -webkit-overflow-scrolling: touch; /* Enable smooth scrolling on iOS */
            width: 100%;
            box-sizing: border-box;
        }
    
    </style>
</head>
<body>

        <div id="content"></div>
    
    <script>

        async function search(word, updateHistory = true) {
            if (!word) return;
            
            const contentDiv = document.getElementById('content');
            contentDiv.style.display = 'block';
            
            // 简单 UI 反馈：鼠标变为等待状态
            document.body.style.cursor = 'wait';
            // 不清空 contentDiv，防止查询失败时丢失当前页面
            
            try {
                const response = await fetch(`search.php?q=${encodeURIComponent(word)}&_=${Date.now()}`, { cache: 'no-store' });
                const data = await response.text();
                
                document.body.style.cursor = 'default';

                if (data) {
                    // 查询成功：更新历史记录并渲染内容
                    if (updateHistory) {
                        const url = new URL(window.location);
                        url.searchParams.set('q', word);
                        const urlString = url.toString().replace(/\\+/g, '%20');
                        window.history.pushState({ q: word }, '', urlString);
                    }

                    contentDiv.innerHTML = data;
                } else {
                    // 查询失败 (未找到)：始终在页面显示，避免白屏
                    contentDiv.innerHTML = `<p style="text-align: center; margin-top: 50px; color: #999;">"${word}" 未找到</p>`;
                }
            } catch (e) {
                document.body.style.cursor = 'default';
                contentDiv.innerHTML = `<p style="text-align: center; margin-top: 50px; color: #cc0000;">查询出错: ${e.message}</p>`;
            }
        }
        
        window.search = search;

        window.addEventListener('DOMContentLoaded', () => {
            const params = new URLSearchParams(window.location.search);
            const word = params.get('q') || params.get('word');
            
            // 初始化时不推入历史，只替换当前状态
            if (word) {
                const url = new URL(window.location);
                url.searchParams.set('q', word);
                window.history.replaceState({ q: word }, '', url.toString());
                search(word, false);
            }
            
            // 监听后退/前进事件 (Handle Back/Forward buttons)
            window.addEventListener('popstate', (event) => {
                const state = event.state;
                if (state && state.q) {
                    search(state.q, false);
                } else {
                    // 如果没有 state (可能是页面初始加载状态)，尝试从 URL 获取
                    const p = new URLSearchParams(window.location.search);
                    const w = p.get('q') || p.get('word');
                    if (w) search(w, false);
                }
            });
            
            // 全局音频点击处理 (Handle audio clicks globally)
            // 拦截所有 .mp3 链接点击，改为直接播放，防止浏览器跳转
            document.addEventListener('click', function(e) {
                const link = e.target.closest('a');
                if (link) {
                    const href = link.getAttribute('href');
                    if (href && (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.spx'))) {
                        e.preventDefault();
                        console.log('Playing audio:', href);
                        const audio = new Audio(href);
                        audio.play().catch(err => console.error('Audio play error:', err));
                    }
                }
            });
        });
    
    </script>
</body>
</html>"""
    
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(html_content)


def create_browser_html():
    """生成带搜索框的 browser.html"""
    print(f"Creating {BROWSER_FILE}...")
    
    html_content = """<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>医学双语词典 - 浏览器</title>
    <link rel="icon" href="medce.png" type="image/png">
    <link rel="stylesheet" href="medce.css">
    <style>
        body { font-family: sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; }
        
        #search-container {
            margin: 10px;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 8px;
            display: flex;
            gap: 10px;
        }
        
        #search-box {
            flex: 1;
            padding: 8px;
            font-size: 16px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        
        #search-btn {
            padding: 8px 16px;
            font-size: 16px;
            cursor: pointer;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
        }
        
        #search-btn:hover {
            background: #0056b3;
        }
        
        #content { flex: 1; border: 1px solid #ddd; margin: 0 10px 10px; padding: 20px; overflow: auto; position: relative; border-radius: 8px; }
    </style>
</head>
<body>
    <div id="search-container">
        <input type="text" id="search-box" placeholder="输入单词..." />
        <button id="search-btn">🔍</button>
    </div>
    <div id="content">
        <p style="color: #666; text-align: center; margin-top: 50px;">输入单词开始搜索。</p>
    </div>

    <script>
        async function search(word, updateHistory = true) {
            if (!word) return;
            
            const contentDiv = document.getElementById('content');
            contentDiv.style.display = 'block';
            
            // 简单 UI 反馈
            document.body.style.cursor = 'wait';
            const searchBtn = document.getElementById('search-btn');
            if (searchBtn) searchBtn.disabled = true;
            
            try {
                const response = await fetch(`search.php?q=${encodeURIComponent(word)}&_=${Date.now()}`, { cache: 'no-store' });
                const data = await response.text();
                
                document.body.style.cursor = 'default';
                if (searchBtn) searchBtn.disabled = false;

                if (data) {
                    // 成功：更新 URL 和 页面
                    if (updateHistory) {
                        const url = new URL(window.location);
                        url.searchParams.set('q', word);
                        const urlString = url.toString().replace(/\\+/g, '%20');
                        window.history.pushState({ q: word }, '', urlString);
                    }
                    
                    contentDiv.innerHTML = data;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    // 失败：始终显示未找到，避免白屏
                    contentDiv.innerHTML = `<p style="text-align: center; margin-top: 50px; color: #999;">"${word}" 未找到</p>`;
                }
            } catch (e) {
                document.body.style.cursor = 'default';
                if (searchBtn) searchBtn.disabled = false;

                contentDiv.innerHTML = `<p style="text-align: center; margin-top: 50px; color: red;">错误: ${e.message}</p>`;
            }
        }
        
        window.search = search;
        
        window.addEventListener('DOMContentLoaded', () => {
            const searchBox = document.getElementById('search-box');
            const searchBtn = document.getElementById('search-btn');
            
            const params = new URLSearchParams(window.location.search);
            const word = params.get('q') || params.get('word');
            
            if (word) {
                searchBox.value = word;
                // 初始化时替换当前状态，不新增历史记录
                const url = new URL(window.location);
                url.searchParams.set('q', word);
                window.history.replaceState({ q: word }, '', url.toString());
                search(word, false);
            }
            
            // 监听后退/前进事件
            window.addEventListener('popstate', (event) => {
                const state = event.state;
                if (state && state.q) {
                    searchBox.value = state.q;
                    search(state.q, false);
                } else {
                    // 尝试从 URL 获取
                    const p = new URLSearchParams(window.location.search);
                    const w = p.get('q') || p.get('word');
                    if (w) {
                        searchBox.value = w;
                        search(w, false);
                    }
                }
            });
            
            searchBtn.addEventListener('click', () => search(searchBox.value));
            
            searchBox.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') search(searchBox.value);
            });
            
            document.addEventListener('click', function(e) {
                const link = e.target.closest('a');
                if (link) {
                    const href = link.getAttribute('href');
                    if (href && (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.spx'))) {
                        e.preventDefault();
                        console.log('Playing audio:', href);
                        const audio = new Audio(href);
                        audio.play().catch(err => console.error('Audio play error:', err));
                    }
                }
            });
            
            // 自动聚焦
            searchBox.focus();
        });
    </script>
</body>
</html>"""
    
    with open(BROWSER_FILE, 'w', encoding='utf-8') as f:
        f.write(html_content)


def create_htaccess():
    """生成 Apache 配置文件 (.htaccess)"""
    print(f"Creating {HTACCESS_FILE}...")
    
    htaccess_content = """# ======================================================================
# | Security & Protection                                              |
# ======================================================================

# 1. 禁止访问敏感文件
# 保护数据库文件 (.db) 和所有隐藏文件 (如 .git, .vscode)
<FilesMatch "(\\.(db|sqlite|sqlite3|log|ini)|^\\.)">
    Require all denied
</FilesMatch>

# 2. 禁止目录浏览
# 防止用户看到文件列表，增强安全性
Options -Indexes

# ======================================================================
# | Compression (Gzip/Deflate)                                         |
# ======================================================================

<IfModule mod_deflate.c>
    # 强制开启压缩，大幅减少传输体积
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css
    AddOutputFilterByType DEFLATE application/javascript application/json
    AddOutputFilterByType DEFLATE application/x-javascript
    AddOutputFilterByType DEFLATE image/svg+xml
    AddOutputFilterByType DEFLATE application/vnd.ms-fontobject application/x-font-ttf font/opentype
</IfModule>

# ======================================================================
# | Browser Caching Strategy (Expires)                                 |
# ======================================================================
# 策略说明：
# 1. 媒体资源 (Audio/Images): 永久缓存 (1年)。因为词典内容一旦生成极少改变。
# 2. 代码资源 (CSS/JS): 长效缓存 (1个月)。
# 3. 入口文件 (HTML): 协商缓存 (0秒)。确保用户总能获取最新的引用。

<IfModule mod_expires.c>
    ExpiresActive On
    
    # 默认策略：1小时
    ExpiresDefault "access plus 1 hour"

    # [HTML] 每次请求都检查更新
    # 这样如果你更新了 JS/CSS，用户刷新 HTML 就能立即生效
    ExpiresByType text/html "access plus 0 seconds"

    # [API/Data] 1周
    # 单词定义的 JSON 数据极少改变，允许短期缓存
    ExpiresByType application/json "access plus 1 week"

    # [Static Assets] 1年 (永久缓存)
    # 图片、音频、字体是词典体积最大的部分，且不会变更
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType audio/mpeg "access plus 1 year"
    ExpiresByType audio/wav "access plus 1 year"
    ExpiresByType audio/x-wav "access plus 1 year"
    ExpiresByType audio/x-spx "access plus 1 year"
    ExpiresByType font/ttf "access plus 1 year"
    ExpiresByType font/otf "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
    ExpiresByType application/font-woff "access plus 1 year"

    # [Code] 1个月
    # 样式和脚本
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/x-javascript "access plus 1 month"
</IfModule>

# ======================================================================
# | Character Set                                                      |
# ======================================================================
AddDefaultCharset UTF-8
"""
    
    with open(HTACCESS_FILE, 'w', encoding='utf-8') as f:
        f.write(htaccess_content)


def copy_files():
    """生成并复制所有必需的文件"""
    print("Generating and copying files to deployment directory...")
    
    # 生成所有文件
    create_search_php()
    create_index_html()
    create_browser_html()
    create_htaccess()
    
    # 复制 CSS 和 PNG
    files_to_copy = [
        ('medce.css', 'medce.css'),
        ('medce.png', 'medce.png'),
    ]
    
    for src, dst in files_to_copy:
        dst_path = os.path.join(WWW_DIR, dst)
        if os.path.exists(src):
            try:
                import shutil
                shutil.copy2(src, dst_path)
                print(f"Copied {src} -> {dst_path}")
            except Exception as e:
                print(f"Error copying {src}: {e}")
        else:
            print(f"Warning: {src} not found, skipping...")


def main():
    parser = argparse.ArgumentParser(description=f'Deploy {PROJECT_NAME} dictionary to web server')
    parser.add_argument('base_dir', nargs='?', default='.', help='Base directory for deployment (default: current directory)')
    parser.add_argument('--all', action='store_true', help='Perform all steps (convert DB and copy files)')
    parser.add_argument('--db', action='store_true', help='Only convert MDX to SQLite database')
    parser.add_argument('--copy', action='store_true', help='Only copy files to deployment directory')
    
    args = parser.parse_args()
    
    setup_config(args.base_dir)

    if not os.path.exists(WWW_DIR):
        os.makedirs(WWW_DIR)
        print(f"Created directory: {WWW_DIR}")
    
    if args.all:
        print("Performing all steps...")
        convert_mdx_to_sqlite()
        copy_files()
    elif args.db:
        print("Performing database conversion step...")
        convert_mdx_to_sqlite()
    else:
        print("Generating files to deployment directory...")
        copy_files()

    print("\n部署准备完成!")
    print(f"1. 将 '{WWW_DIR}' 目录的内容上传到 Apache 服务器。")


if __name__ == '__main__':
    main()
