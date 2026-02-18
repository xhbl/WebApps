import os
import sqlite3
import struct
import zlib
import re
import shutil
import glob
import argparse

class HtmlBuilder:
    def __init__(self):
        self.title = "Document"
        self.head_content = []
        self.styles = []
        self.scripts = []
        self.body_content = []
        self.inline_scripts = []

    def set_title(self, title):
        self.title = title

    def add_style(self, css_content):
        self.styles.append(css_content)

    def add_script(self, src):
        self.scripts.append(src)

    def add_body_content(self, content):
        self.body_content.append(content)

    def add_inline_script(self, script_content):
        self.inline_scripts.append(script_content)

    def build(self):
        html = [
            "<!DOCTYPE html>",
            "<html lang='en'>",
            "<head>",
            "    <meta charset='UTF-8'>",
            "    <meta name='viewport' content='width=device-width, initial-scale=1.0'>",
            f"    <title>{self.title}</title>"
        ]
        
        # Add custom head content (meta tags, links, etc.)
        html.extend(self.head_content)
        
        # Add external scripts
        for src in self.scripts:
            html.append(f"    <script src='{src}'></script>")
            
        # Add styles
        if self.styles:
            html.append("    <style>")
            for style in self.styles:
                html.append(style)
            html.append("    </style>")
            
        html.append("</head>")
        html.append("<body>")
        
        # Add body content
        for content in self.body_content:
            html.append(content)
            
        # Add inline scripts at the end of body
        if self.inline_scripts:
            html.append("    <script>")
            for script in self.inline_scripts:
                html.append(script)
            html.append("    </script>")
            
        html.append("</body>")
        html.append("</html>")
        
        return "\n".join(html)

try:
    from readmdict import MDX, MDD
except ImportError:
    try:
        from mdict_utils.base.readmdict import MDX, MDD
    except ImportError:
        print("Could not import MDX/MDD. Please install readmdict.")
        exit(1)

# 配置常量
PROJECT_NAME = 'cambridge'
MDX_FILE = 'cdepe.mdx'
WWW_DIR = '' # 将在 setup_config 中动态生成
DB_FILE = ''
PHP_FILE = ''
PHP_AUDIO_FILE = ''
INDEX_FILE = ''
BROWSER_FILE = ''

def setup_config(base_dir):
    """
    根据起始目录和项目名称初始化所有文件路径配置。
    """
    global WWW_DIR, DB_FILE, PHP_FILE, PHP_AUDIO_FILE, INDEX_FILE, BROWSER_FILE
    
    # 如果 base_dir 为空或 None，默认为当前目录
    if not base_dir:
        base_dir = '.'
        
    WWW_DIR = os.path.join(base_dir, PROJECT_NAME)
    DB_FILE = os.path.join(WWW_DIR, f'{PROJECT_NAME}.db')
    PHP_FILE = os.path.join(WWW_DIR, 'search.php')
    PHP_AUDIO_FILE = os.path.join(WWW_DIR, 'search_audio.php')
    INDEX_FILE = os.path.join(WWW_DIR, 'index.html')
    BROWSER_FILE = os.path.join(WWW_DIR, 'browser.html')
    
    print(f"Output directory set to: {os.path.abspath(WWW_DIR)}")
    print(f"Database file set to: {os.path.abspath(DB_FILE)}")

def extract_mdd_files():
    """
    解包所有 .mdd 资源文件到输出目录。
    """
    mdd_files = glob.glob('*.mdd')
    if not mdd_files:
        print("No .mdd files found in current directory.")
        return

    print(f"Found {len(mdd_files)} .mdd files. Extracting...")
    
    for mdd_file in mdd_files:
        print(f"Extracting {mdd_file}...")
        try:
            mdd = MDD(mdd_file)
            for key, value in mdd.items():
                key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                # 资源键通常以 \ 开头，例如 \sound\abc.mp3
                # 规范化路径：去除首部斜杠，将反斜杠转换为正斜杠
                rel_path = key_str.lstrip('\\').lstrip('/').replace('\\', '/')
                
                # 音频文件的特殊处理
                # 强制将所有音频文件放入 'audio/' 子目录，以便于管理和路径映射
                if rel_path.lower().endswith(('.mp3', '.wav')):
                    # 如果路径本身不包含 audio/ 前缀，则添加它
                    if not rel_path.lower().startswith('audio/'):
                         rel_path = 'audio/' + rel_path
                
                file_path = os.path.join(WWW_DIR, rel_path)
                
                # 确保目标目录存在
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                with open(file_path, 'wb') as f:
                    f.write(value)
            print(f"Finished extracting {mdd_file}")
        except Exception as e:
            print(f"Error extracting {mdd_file}: {e}")

def convert_mdx_to_sqlite():
    """
    将 MDX 词典文件转换为 SQLite 数据库。
    目的：MDX 格式不适合 Web 直接访问，转换成 SQLite 后可以通过 PHP 高效查询。
    改进：先插入真实词条，再插入 @@@LINK= 词条（仅当词条不存在时），避免覆盖真实内容。
    """
    print(f"Converting {MDX_FILE} to SQLite database...")
    
    # 确保输出目录存在
    os.makedirs(WWW_DIR, exist_ok=True)
    
    if os.path.exists(DB_FILE):
        print(f"Removing existing database: {DB_FILE}")
        try:
            os.remove(DB_FILE)
        except PermissionError:
            print(f"Error: Cannot remove {DB_FILE}. It might be in use.")
            return

    if not os.path.exists(MDX_FILE):
        print(f"Error: {MDX_FILE} not found in the current directory.")
        return

    try:
        mdx = MDX(MDX_FILE)
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        print("Creating table 'dictionary' with 'word' (COLLATE NOCASE) and 'content' columns...")
        cursor.execute('CREATE TABLE dictionary (word TEXT PRIMARY KEY COLLATE NOCASE, content TEXT)')

        total_real_entries = 0
        BATCH_SIZE = 5000

        print("Starting data extraction and insertion (this may take a while)...")

        # 1. 先收集所有词条，区分真实内容和@@@LINK=内容
        real_entries = []
        link_entries = []
        for key, value in mdx.items():
            try:
                word = key.decode('utf-8').strip()
                if not word:
                    continue
                # 尝试解码内容，处理可能的编码问题
                try:
                    content = value.decode('utf-8')
                except UnicodeDecodeError:
                    try:
                        content = value.decode('utf-16')
                    except UnicodeDecodeError:
                        print(f"Warning: Could not decode content for word: {word}")
                        continue
                if content.startswith('@@@LINK='):
                    link_entries.append((word, content))
                else:
                    real_entries.append((word, content))
            except Exception as e:
                print(f"Warning: Skipping an entry due to error: {e}")
                continue

        # 2. 先插入真实内容
        print(f"Inserting {len(real_entries)} real entries...")
        for i in range(0, len(real_entries), BATCH_SIZE):
            batch = real_entries[i:i+BATCH_SIZE]
            cursor.executemany('INSERT OR REPLACE INTO dictionary (word, content) VALUES (?, ?)', batch)
            total_real_entries += len(batch)
            if total_real_entries % 50000 == 0:
                print(f"Processed {total_real_entries} real entries...")

        # 3. 再插入@@@LINK=，但只插入数据库中还没有的词条
        print(f"Inserting {len(link_entries)} LINK entries (only if word not already exists)...")
        for i in range(0, len(link_entries), BATCH_SIZE):
            batch = link_entries[i:i+BATCH_SIZE]
            cursor.executemany('INSERT OR IGNORE INTO dictionary (word, content) VALUES (?, ?)', batch)
            # 不统计 LINK 插入数量，因为可能被忽略

        conn.commit()
        conn.close()
        print(f"\nSuccessfully created database '{DB_FILE}' with {total_real_entries} real entries (LINK entries inserted only if word didn't exist).")

    except Exception as e:
        print(f"An unexpected error occurred: {e}")

def build_php_common_lookup(param_name, empty_response_php, update_word_on_redirect=False, status_key='found'):
    """
    构建 search.php / search_audio.php 共享的 PHP 查询主干代码。
    包含：
    1. 读取查询参数
    2. 锚点清理
    3. 数据库连接
    4. 主查询 + @@@LINK= 重定向
    """
    update_word_line = "$word = $target;" if update_word_on_redirect else ""

    if isinstance(param_name, (list, tuple)):
        get_expr = " ?? ".join([f"$_GET['{name}']" for name in param_name]) + " ?? ''"
    else:
        get_expr = f"$_GET['{param_name}'] ?? ''"

    template = """$word = __GET_EXPR__;
if (empty($word)) {
    __EMPTY_RESPONSE__
    exit;
}

// 处理锚点 (Handle anchors)
if (strpos($word, '#') !== false) {
    $word = explode('#', $word)[0];
}
$word = trim($word);

$dbFile = __DIR__ . '/__PROJECT_NAME__.db';
if (!file_exists($dbFile)) {
    echo json_encode(['__STATUS_KEY__' => false, 'error' => 'Database not found']);
    exit;
}

try {
    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->prepare('SELECT content FROM dictionary WHERE word = :word');
    $stmt->execute([':word' => $word]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        $html = $result['content'];
        
        // 处理重定向 (Handle redirects @@@LINK=)
        // MDX 格式使用 @@@LINK= 表示该词条是另一个词条的别名
        if (strpos($html, '@@@LINK=') === 0) {
            $target = trim(substr($html, 8));
            $stmt->execute([':word' => $target]);
            $result2 = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result2) {
                $html = $result2['content'];
                __UPDATE_WORD_LINE__
            }
        }
    }
"""
    return (
        template
        .replace('__GET_EXPR__', get_expr)
        .replace('__EMPTY_RESPONSE__', empty_response_php)
        .replace('__PROJECT_NAME__', PROJECT_NAME)
        .replace('__UPDATE_WORD_LINE__', update_word_line)
        .replace('__STATUS_KEY__', status_key)
    )

def create_search_php():
    """
    生成后端 PHP 搜索接口。
    功能：
    1. 接收查询参数 q/word
    2. 查询 SQLite 数据库
    3. 处理 @@@LINK= 重定向
    4. 修正资源路径并提供容错（避免 content 变空导致白屏）
    """
    print(f"Creating {PHP_FILE}...")
    common_lookup = build_php_common_lookup(
        param_name=['q', 'word'],
        empty_response_php="echo json_encode(['found' => false]);",
        update_word_on_redirect=False,
        status_key='found'
    )

    php_content = f"""<?php
header('Content-Type: application/json');
header('X-CDEPE-Search-Version: 2026-02-17-r2');
// header('Access-Control-Allow-Origin: *');

ini_set('display_errors', '0');
error_reporting(E_ALL);
ob_start();
set_error_handler(function($severity, $message, $file, $line) {{
    error_log("[search.php warning] $message in $file:$line");
    return true;
}});

function send_json_and_exit($payload) {{
    while (ob_get_level() > 0) {{
        ob_end_clean();
    }}
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    restore_error_handler();
    exit;
}}

{common_lookup}

    if ($result) {{
        $rawHtml = $html;

        $applyRegex = function($pattern, $replacement, $subject) {{
            $tmp = preg_replace($pattern, $replacement, $subject);
            return $tmp === null ? $subject : $tmp;
        }};

        $applyCallback = function($pattern, $callback, $subject) {{
            $tmp = preg_replace_callback($pattern, $callback, $subject);
            return $tmp === null ? $subject : $tmp;
        }};

        $html = $applyCallback('/sound:\/\/([^"\\']+)/', function($matches) {{
            $path = $matches[1];
            $path = str_replace('\\\\', '/', $path);
            $path = ltrim($path, '/');
            return 'audio/' . $path;
        }}, $html);

        $html = $applyCallback('/href="([^"]+)"/i', function($matches) {{
            $href = $matches[1];
            if (preg_match('/^(audio\/|https?:\/\/)/i', $href)) {{
                return 'href="' . $href . '"';
            }}
            if (preg_match('/\.(mp3|wav)(?:$|[?#])/i', $href)) {{
                return 'href="audio/' . ltrim($href, '/') . '"';
            }}
            return 'href="' . $href . '"';
        }}, $html);

        $html = $applyCallback('/entry:\/\/([^"\\']+)/', function($matches) {{
            return "javascript:search('" . addslashes($matches[1]) . "')";
        }}, $html);

        $html = $applyRegex('/<\/?body[^>]*>/i', '', $html);
        $html = $applyRegex('/<\/?body-content[^>]*>/i', '', $html);
        $html = $applyRegex('/<link[^>]*>/i', '', $html);
        $html = $applyRegex('/<script[^>]*>.*?<\/script>/is', '', $html);

        $html = $applyRegex('/src="([^"\/\\\\]+\.png)"/i', 'src="images/$1"', $html);
        $html = $applyRegex('/src="([^"\/]+\.(jpg|jpeg|gif|webp|svg))"/i', 'src="images/$1"', $html);

        if ($html === '' && $rawHtml !== '') {{
            $html = $rawHtml;
        }}

        $payload = [
            'found' => true,
            'word' => $word,
            'content' => $html,
        ];

        send_json_and_exit($payload);
    }} else {{
        send_json_and_exit(['found' => false, 'word' => $word]);
    }}
}} catch (Exception $e) {{
    send_json_and_exit(['found' => false, 'error' => $e->getMessage()]);
}}
?>"""
    with open(PHP_FILE, 'w', encoding='utf-8') as f:
        f.write(php_content)

def create_search_audio_php():
    """
    生成音频查询接口 search_audio.php。
    功能：
    1. 接收 word 参数并查询词条
    2. 处理 @@@LINK= 重定向
    3. 按优先级提取发音音频（US -> UK -> 兜底）
    4. 返回可直接访问的 audio URL
    """
    print(f"Creating {PHP_AUDIO_FILE}...")
    common_lookup = build_php_common_lookup(
        param_name=['q', 'word'],
        empty_response_php="echo json_encode(['success' => false, 'error' => 'Query parameter is missing.']);",
        update_word_on_redirect=False,
        status_key='success'
    )
    php_content = f"""<?php
header('Content-Type: application/json');
// header('Access-Control-Allow-Origin: *');

// --- Configuration ---
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'];
$current_dir = str_replace('\\\\', '/', realpath(__DIR__) ?: __DIR__);
$document_root = str_replace('\\\\', '/', realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: ($_SERVER['DOCUMENT_ROOT'] ?? ''));

if ($document_root !== '' && strpos($current_dir, rtrim($document_root, '/')) === 0) {{
    $script_path = substr($current_dir, strlen(rtrim($document_root, '/')));
}} else {{
    $script_path = dirname($_SERVER['SCRIPT_NAME'] ?? '');
}}

$script_path = '/' . trim(str_replace('\\\\', '/', $script_path), '/');
$base_audio_url = rtrim($protocol . $host . $script_path, '/') . '/audio/';

{common_lookup}

    $sound_file = null;

    if ($result) {{
        // --- Sound File Extraction Logic (Cambridge specific) ---
        // 优先提取词头区域的美音（us dpron-i），其次英音（uk dpron-i），最后兜底首个音频。
        $sound_file = null;

        $isAudioHref = function($href) {{
            if (!$href) return false;
            if (stripos($href, 'sound://') === 0) return true;
            return preg_match('/\\.(mp3|wav)(?:$|[?#])/i', $href) === 1;
        }};

        libxml_use_internal_errors(true);
        $doc = new DOMDocument();
        $wrapped = '<!DOCTYPE html><html><body>' . $html . '</body></html>';
        $loaded = $doc->loadHTML('<?xml encoding="utf-8" ?>' . $wrapped);

        if ($loaded !== false) {{
            $xpath = new DOMXPath($doc);

            // Priority 1: US pronunciation block in Cambridge entries
            $usNodes = $xpath->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' us ') and contains(concat(' ', normalize-space(@class), ' '), ' dpron-i ')]//a[@href]");
            if ($usNodes && $usNodes->length > 0) {{
                foreach ($usNodes as $node) {{
                    $candidate = $node->getAttribute('href');
                    if ($isAudioHref($candidate)) {{
                        $sound_file = $candidate;
                        break;
                    }}
                }}
            }}

            // Priority 2: UK pronunciation block
            if (!$sound_file) {{
                $ukNodes = $xpath->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' uk ') and contains(concat(' ', normalize-space(@class), ' '), ' dpron-i ')]//a[@href]");
                if ($ukNodes && $ukNodes->length > 0) {{
                    foreach ($ukNodes as $node) {{
                        $candidate = $node->getAttribute('href');
                        if ($isAudioHref($candidate)) {{
                            $sound_file = $candidate;
                            break;
                        }}
                    }}
                }}
            }}

            // Priority 3: first available audio link in entry
            if (!$sound_file) {{
                $allLinks = $xpath->query('//a[@href]');
                if ($allLinks) {{
                    foreach ($allLinks as $link) {{
                        $candidate = $link->getAttribute('href');
                        if ($isAudioHref($candidate)) {{
                            $sound_file = $candidate;
                            break;
                        }}
                    }}
                }}
            }}
        }}
        libxml_clear_errors();
    }}

    // --- JSON Response ---
    if ($sound_file) {{
        // Normalize protocol/path and avoid duplicating audio/ prefix
        if (strpos($sound_file, 'sound://') === 0) {{
            $sound_file = substr($sound_file, 8);
        }}
        $sound_file = strtr($sound_file, array(chr(92) => '/'));
        $sound_file = ltrim($sound_file, '/');

        if (strpos($sound_file, 'audio/') === 0) {{
            $sound_file = substr($sound_file, 6);
        }}

        // Keep original nested path under audio/ (e.g. us_pron/u/usu/...mp3)
        $decoded_file = urldecode($sound_file);
        $relative_audio_path = 'audio/' . $decoded_file;
        $absolute_audio_path = __DIR__ . '/' . $relative_audio_path;

        if (!file_exists($absolute_audio_path)) {{
            echo json_encode(['success' => false, 'word' => $word, 'error' => 'audio file not exist']);
            exit;
        }}

        $segments = array_map('rawurlencode', explode('/', $decoded_file));
        $encoded_file = implode('/', $segments);
        $full_url = $base_audio_url . $encoded_file;
        echo json_encode(['success' => true, 'word' => $word, 'url' => $full_url]);
    }} else {{
        echo json_encode(['success' => false, 'word' => $word]);
    }}

}} catch (Exception $e) {{
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}}
?>"""
    with open(PHP_AUDIO_FILE, 'w', encoding='utf-8') as f:
        f.write(php_content)

def create_index_html():
    """
    生成用于 iframe 嵌入的精简版 HTML (index.html)。
    特点：
    - 无搜索框
    - 包含完整的 JS/CSS 支持
    - 提供 search(word) 全局函数供父页面调用
    """
    print(f"Creating {INDEX_FILE}...")
    builder = HtmlBuilder()
    builder.set_title("剑桥在线英汉双解词典")
    
    # 添加 Favicon
    builder.head_content.append('<link rel="icon" href="cdepe.png" type="image/png">')
    
    builder.add_style("""
        @import url("cdepe.css");
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
    """)
    builder.add_script("cdepe-jquery-3.6.0.min.js")
    builder.add_script("cdepe-crypto-js.min.js")
    builder.add_script("cdepe.js")
    
    builder.add_body_content("""
        <div id="content" class="cdepe"></div>
    """)
    
    builder.add_inline_script("""
        async function reinitializeCdepe(contentDiv) {
            try {
                document.querySelectorAll('.cdepe-nav, .cdepe-nav-dict, .cdepe-nav-sense, .cdepe-nav-sense-title').forEach(el => el.remove());
                const marker = contentDiv.querySelector('#is-cdepe-loaded');
                if (marker) marker.remove();

                const oldScript = document.getElementById('cdepe-runtime-script');
                if (oldScript) oldScript.remove();

                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.id = 'cdepe-runtime-script';
                    script.src = `cdepe.js?v=${Date.now()}`;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            } catch (e) {
                console.error('Error re-initializing dictionary script:', e);
            }
        }

        async function search(word, updateHistory = true) {
            if (!word) return;
            
            const contentDiv = document.getElementById('content');
            contentDiv.style.display = 'block';
            
            // 简单 UI 反馈：鼠标变为等待状态
            document.body.style.cursor = 'wait';
            // 不清空 contentDiv，防止查询失败时丢失当前页面
            
            try {
                const response = await fetch(`search.php?q=${encodeURIComponent(word)}&_=${Date.now()}`, { cache: 'no-store' });
                const data = await response.json();
                
                document.body.style.cursor = 'default';

                if (data.found) {
                    // 查询成功：更新历史记录并渲染内容
                    if (updateHistory) {
                        const url = new URL(window.location);
                        url.searchParams.set('q', word);
                        const urlString = url.toString().replace(/\+/g, '%20');
                        window.history.pushState({ q: word }, '', urlString);
                    }

                    contentDiv.innerHTML = data.content;
                    
                    await reinitializeCdepe(contentDiv);
                } else {
                    // 查询失败 (未找到)：始终在页面显示，避免白屏
                    contentDiv.innerHTML = `<p style="text-align: center; margin-top: 50px; color: #999;">“${word}” 未找到</p>`;
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
                    if (href && (href.endsWith('.mp3') || href.endsWith('.wav'))) {
                        e.preventDefault();
                        console.log('Playing audio:', href);
                        const audio = new Audio(href);
                        audio.play().catch(err => console.error('Audio play error:', err));
                    }
                }
            });
        });
    """)
    
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(builder.build())

def create_browser_html():
    """
    生成带搜索界面的完整版 HTML (browser.html)。
    特点：
    - 包含搜索框和按钮
    - 支持 URL 参数查询
    - 支持浏览器历史记录 (pushState)
    """
    print(f"Creating {BROWSER_FILE}...")
    builder = HtmlBuilder()
    builder.set_title("剑桥在线英汉双解词典 - 浏览器")
    
    # 添加 Favicon
    builder.head_content.append('<link rel="icon" href="cdepe.png" type="image/png">')
    
    builder.add_style("""
        @import url("cdepe.css");
        body { font-family: sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; }
        
        #search-container {
            margin-bottom: 20px;
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
        
        #content { flex: 1; border: 1px solid #ddd; padding: 20px; overflow: auto; position: relative; border-radius: 8px; }
    """)
    builder.add_script("cdepe-jquery-3.6.0.min.js")
    builder.add_script("cdepe-crypto-js.min.js")
    builder.add_script("cdepe.js")
    
    builder.add_body_content("""
        <div id="search-container">
            <input type="text" id="search-box" placeholder="输入单词..." />
            <button id="search-btn">🔍</button>
        </div>
        <div id="content" class="cdepe">
            <p style="color: #666; text-align: center; margin-top: 50px;">输入单词开始搜索。</p>
        </div>
    """)
    
    builder.add_inline_script("""
        async function reinitializeCdepe(contentDiv) {
            try {
                document.querySelectorAll('.cdepe-nav, .cdepe-nav-dict, .cdepe-nav-sense, .cdepe-nav-sense-title').forEach(el => el.remove());
                const marker = contentDiv.querySelector('#is-cdepe-loaded');
                if (marker) marker.remove();

                const oldScript = document.getElementById('cdepe-runtime-script');
                if (oldScript) oldScript.remove();

                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.id = 'cdepe-runtime-script';
                    script.src = `cdepe.js?v=${Date.now()}`;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            } catch (err) {
                console.error('Error re-initializing dictionary script:', err);
            }
        }

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
                const data = await response.json();
                
                document.body.style.cursor = 'default';
                if (searchBtn) searchBtn.disabled = false;

                if (data.found) {
                    // 成功：更新 URL 和 页面
                    if (updateHistory) {
                        const url = new URL(window.location);
                        url.searchParams.set('q', word);
                        const urlString = url.toString().replace(/\+/g, '%20');
                        window.history.pushState({ q: word }, '', urlString);
                    }
                    
                    contentDiv.innerHTML = data.content;
                    
                    await reinitializeCdepe(contentDiv);
                } else {
                    // 失败：始终显示未找到，避免白屏
                    contentDiv.innerHTML = `<p style="text-align: center; margin-top: 50px; color: #999;">“${word}” 未找到</p>`;
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
                    if (href && (href.endsWith('.mp3') || href.endsWith('.wav'))) {
                        e.preventDefault();
                        console.log('Playing audio:', href);
                        const audio = new Audio(href);
                        audio.play().catch(err => console.error('Audio play error:', err));
                    }
                }
            });
        });
    """)
    
    with open(BROWSER_FILE, 'w', encoding='utf-8') as f:
        f.write(builder.build())

def create_htaccess():
    """
    生成 Apache 配置文件 (.htaccess)。
    功能：
    1. 安全：禁止访问数据库和隐藏文件。
    2. 性能：开启 Gzip 压缩。
    3. 缓存：设置静态资源的长效缓存策略。
    """
    print("Creating .htaccess file...")
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
    htaccess_path = os.path.join(WWW_DIR, '.htaccess')
    with open(htaccess_path, 'w', encoding='utf-8') as f:
        f.write(htaccess_content)
    print(f"Created {htaccess_path}")

def organize_images():
    """将根目录图片移入 images/ 子目录（保留 favicon）"""
    images_dir = os.path.join(WWW_DIR, 'images')
    if not os.path.exists(images_dir):
        os.makedirs(images_dir)
        
    print("Moving root image files to images/ (excluding favicon cdepe.png)...")
    moved_image_count = 0
    image_exts = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg')
    for filename in os.listdir(WWW_DIR):
        if (
            filename.lower().endswith(image_exts)
            and filename.lower() != 'cdepe.png'
            and os.path.isfile(os.path.join(WWW_DIR, filename))
        ):
            src_path = os.path.join(WWW_DIR, filename)
            dst_path = os.path.join(images_dir, filename)
            shutil.move(src_path, dst_path)
            moved_image_count += 1
            
    if moved_image_count > 0:
        print(f"Moved {moved_image_count} images to {images_dir}")

def copy_favicon():
    """确保 Favicon 存在于根目录（可覆盖更新）"""
    if os.path.exists('cdepe.png'):
        print("Copying cdepe.png to root directory (as favicon)...")
        shutil.copy('cdepe.png', os.path.join(WWW_DIR, 'cdepe.png'))
    else:
        print("Warning: cdepe.png not found in current directory.")

def copy_and_patch_assets():
    """复制静态资源 (CSS/JS) 并应用补丁"""
    print("Copying static assets...")
    for asset in ['cdepe.css', 'cdepe.js', 'cdepe-jquery-3.6.0.min.js', 'cdepe-crypto-js.min.js']:
        if os.path.exists(asset):
            if asset == 'cdepe.js':
                # 应用 Patch：修复原始 JS 在动态加载环境下的 Bug
                print(f"Patching and copying {asset}...")
                with open(asset, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Patch 1: 修复双重绑定问题（Cambridge版等价实现）
                # 目的与牛津版一致：防止动态重新初始化后 click 事件重复绑定。
                # Cambridge 原始 JS 不含牛津版的 "$x.children('.x-nav')" 与 "$x = $(this)" 结构，
                # 因此改为将所有 .click(function...) 统一转为 .off('click').on('click', function...)
                # 使绑定幂等。
                content = re.sub(
                    r"\.click\(\s*function\(([^)]*)\)\s*\{",
                    r".off('click').on('click', function(\1) {",
                    content
                )

                # Patch 1.1: 移动端兼容 - 去除 UA/noConflict 的隐式链式调用，改为显式 jQuery 注入执行
                # 原始结构依赖：(function(){...return jQuery/noConflict...})()(function($){...});
                # 在部分安卓环境中可能导致初始化未执行。这里改为稳定的 IIFE 调用。
                content = re.sub(
                    r"\(function \(\) \{[\s\S]*?\}\)\(\)\s*\n\s*\(function \(\$\) \{",
                    "(function ($) {\\n    if (!$) { console.error('cdepe: jQuery not found'); return; }",
                    content,
                    count=1
                )
                content = re.sub(
                    r"\}\);\s*$",
                    "})(window.jQuery || window.$);",
                    content,
                    count=1
                )

                # Patch 2: 仅在部署产物中默认显示中文翻译
                content = re.sub(
                    r"(showTranslation\s*:\s*)0(\s*,)",
                    r"\g<1>1\g<2>",
                    content,
                    count=1
                )
                
                dest_path = os.path.join(WWW_DIR, asset)
                with open(dest_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Copied and patched {asset}")
            else:
                shutil.copy(asset, WWW_DIR)
                print(f"Copied {asset}")
        else:
            print(f"Warning: {asset} not found")

def patch_css_nav_colors():
    """仅在部署产物中 Patch 导航背景色（不修改源文件 cdepe.css）"""
    css_path = os.path.join(WWW_DIR, 'cdepe.css')
    if os.path.exists(css_path):
        print(f"Patching {css_path} nav background colors...")
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()

        css_content = re.sub(
            r"(\.cdepe-nav\s*\{[\s\S]*?background-color:\s*)[^;]+;",
            r"\g<1>#55bab6;",
            css_content,
            count=1
        )
        css_content = re.sub(
            r"(\.cdepe-nav-dict\s*\{[\s\S]*?background-color:\s*)[^;]+;",
            r"\g<1>#202954;",
            css_content,
            count=1
        )
        css_content = re.sub(
            r"(\.cdepe-nav-sense-title\s*\{[\s\S]*?background-color:\s*)[^;]+;",
            r"\g<1>#55bab6;",
            css_content,
            count=1
        )
        css_content = re.sub(
            r"(\.cdepe-nav-sense\s*\{[\s\S]*?\n\s*)background-color:\s*[^;]+;",
            r"\1background-color: #202954;",
            css_content,
            count=1
        )

        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css_content)
        print("Patched cdepe.css nav colors.")

def patch_js_image_logic():
    """Patch cdepe.js to fix image path construction for simplified/traditional characters"""
    js_path = os.path.join(WWW_DIR, 'cdepe.js')
    if os.path.exists(js_path):
        print(f"Patching {js_path} for image paths...")
        with open(js_path, 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        # Replace the logic for data-simplified and data-traditional
        # We use regex to handle potential whitespace variations
        
        # Original code pattern to match:
        # const src = $img.data('src');
        # const [baseName, extension] = src.split('.');
        
        # We need to ensure baseName does not contain path separators if src has them (e.g. images/foo.png)
        # So we patch the JS to extract only the filename part.
        
        js_content = re.sub(
            r"const src = \$img\.data\('src'\);\s*const \[baseName, extension\] = src\.split\('\.'\);",
            r"const src = $img.data('src');\n                const fileName = src.split('/').pop();\n                const [baseName, extension] = fileName.split('.');",
            js_content
        )
        
        # Also patch the simplified/traditional logic to be safe
        js_content = re.sub(
            r"'data-simplified':\s*\$img\.attr\('src'\)\.replace\(src,\s*`simplified/\${baseName}_simplified\.\${extension}`\),",
            "'data-simplified': `simplified/${baseName}_simplified.${extension}`,",
            js_content
        )
        
        js_content = re.sub(
            r"'data-traditional':\s*\$img\.attr\('src'\)\.replace\(src,\s*`traditional/\${baseName}_traditional\.\${extension}`\)",
            "'data-traditional': `traditional/${baseName}_traditional.${extension}`",
            js_content
        )
        
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print("Patched cdepe.js image logic.")

def generate_all_files():
    """执行除解包和数据库转换外的所有生成步骤（PHP、HTML、静态资源、补丁、移动图片、htaccess等）"""
    # 3. 生成后端和前端代码
    create_search_php()
    create_search_audio_php()
    create_index_html()
    create_browser_html()
    
    # 4. 复制静态资源 (CSS/JS)
    copy_and_patch_assets()

    # 4.1 仅在部署产物中 Patch 导航背景色
    patch_css_nav_colors()

    # 5. 整理图片资源 (将根目录图片移入 images/，但保留 favicon)
    organize_images()

    # 6. 确保 Favicon 存在于根目录（可覆盖更新）
    copy_favicon()

    create_htaccess()

    # Patch cdepe.js to fix image path construction
    patch_js_image_logic()

def main():
    parser = argparse.ArgumentParser(description='Prepare Cambridge Dictionary for Apache Deployment')
    parser.add_argument('base_dir', nargs='?', default='.', help='Base directory for deployment (default: current directory). The project will be created in a subdirectory named "{PROJECT_NAME}".')
    parser.add_argument('--extract', action='store_true', help='Extract .mdd files and organize images only.')
    parser.add_argument('--db', action='store_true', help='Convert MDX to SQLite database only.')
    parser.add_argument('--all', action='store_true', help='Perform all steps (extract, db, and generate files).')
    args = parser.parse_args()
    
    # 初始化配置
    setup_config(args.base_dir)

    if not os.path.exists(WWW_DIR):
        os.makedirs(WWW_DIR)
        print(f"Created directory: {WWW_DIR}")
    
    if args.all:
        print("Performing all steps...")
        # 1. 解包资源
        extract_mdd_files()
        # 2. 转换数据库
        convert_mdx_to_sqlite()
        # 3. 生成所有文件
        generate_all_files()
    elif args.extract:
        print("Performing extract step...")
        extract_mdd_files()
        # 整理图片资源 (解包后立即整理)
        organize_images()
    elif args.db:
        print("Performing database conversion step...")
        convert_mdx_to_sqlite()
    else:
        print("Performing file generation and asset copying steps...")
        # 无参数：执行除了1和2以外的所有操作
        generate_all_files()

    print("\nDeployment preparation complete!")
    if args.all or not (args.extract or args.db):
        print(f"1. Upload the contents of '{WWW_DIR}' to your Apache server.")
    else:
        print(f"Partial steps completed. You may need to run other steps later.")

if __name__ == '__main__':
    main()