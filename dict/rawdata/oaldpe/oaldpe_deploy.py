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
PROJECT_NAME = 'oxford'
MDX_FILE = 'oaldpe.mdx'
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
    """
    print(f"Converting {MDX_FILE} to SQLite database...")
    
    if os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except PermissionError:
            print(f"Error: Cannot remove {DB_FILE}. It might be in use.")
            return

    if not os.path.exists(MDX_FILE):
        print(f"Error: {MDX_FILE} not found.")
        return

    mdx = MDX(MDX_FILE)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE dictionary (word TEXT PRIMARY KEY COLLATE NOCASE, content TEXT)')
    
    count = 0
    BATCH_SIZE = 5000
    cache = {}
    print("Building database (this may take a minute)...")
    for key, value in mdx.items():
        try:
            word = key.decode('utf-8').strip()
            try:
                content = value.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    content = value.decode('utf-16')
                except:
                    continue
            # 跳过link覆盖已有内容
            lower_word = word.lower()
            if lower_word in cache:
                # 已有内容且新内容是LINK则跳过
                if content.strip().startswith('@@@LINK='):
                    continue
            cache[lower_word] = (word, content)
        except Exception:
            continue
    # 批量插入
    batch = list(cache.values())
    count = 0
    for i in range(0, len(batch), BATCH_SIZE):
        cursor.executemany('INSERT OR REPLACE INTO dictionary (word, content) VALUES (?, ?)', batch[i:i+BATCH_SIZE])
        count += len(batch[i:i+BATCH_SIZE])
        if count % 50000 == 0 or i + BATCH_SIZE >= len(batch):
            print(f"Processed {count} entries...")
    conn.commit()
    conn.close()
    print(f"Database created at {DB_FILE}")

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
    1. 接收查询参数 q
    2. 查询 SQLite 数据库
    3. 处理 @@@LINK= 重定向
    4. 修正资源路径（sound:// -> audio/, entry:// -> javascript:search）
    """
    print(f"Creating {PHP_FILE}...")
    common_lookup = build_php_common_lookup(
        param_name=['q', 'word'],
        empty_response_php="echo json_encode(['found' => false]);",
        update_word_on_redirect=True,
        status_key='found'
    )
    php_content = f"""<?php
header('Content-Type: application/json');
// header('Access-Control-Allow-Origin: *');

{common_lookup}
    if ($result) {{
        
        // 修正音频路径 (Fix sound:// paths)
        // 将 sound://path/to/file.mp3 转换为 audio/path/to/file.mp3
        // 并处理 Windows 路径分隔符
    $html = preg_replace_callback('/sound:\/\/([^"\\']+)/', function($matches) {{
        $path = $matches[1];
        $path = str_replace('\\\\', '/', $path); 
        $path = ltrim($path, '/');
        return 'audio/' . $path;
    }}, $html);

    // 修正普通 href 音频链接 (Fix href="file.mp3")
    // 将 href="file.mp3" 转换为 href="audio/file.mp3"
    // 排除已经包含 audio/ 或 http/https 的链接
    $html = preg_replace('/href="(?!(audio\/|http:\/\/|https:\/\/))([^"]+\.(mp3|wav))"/', 'href="audio/$2"', $html);
        
        // 修正内部链接 (Fix entry:// to javascript calls)
        // 将 entry://word 转换为 javascript:search('word')
        $html = preg_replace_callback('/entry:\/\/([^"\\']+)/', function($matches) {{
            return "javascript:search('" . addslashes($matches[1]) . "')";
        }}, $html);

        // 修正图片路径 (Fix image paths)
        // 将根目录图片引用移动到 images/ 子目录
        // 1. 仅替换 src 属性
        // 2. 仅匹配不包含路径分隔符 (/ 或 \) 的文件名
        // 3. 排除 data-src 等其他属性
        // 注意：使用更安全的捕获组方式，避免Lookbehind断言在不同PHP版本中的兼容性问题
        // 正则解释：
        // src="        : 匹配 src=" 字面量
        // (            : 开始捕获组1
        //   [^"\/\\\\]+ : 匹配不包含 " / \ 的字符 (文件名)
        //   \.png      : 匹配 .png 后缀
        // )            : 结束捕获组1
        // "            : 匹配结束的引号
        $html = preg_replace('/src="([^"\/\\\\\\\\]+\.png)"/', 'src="images/$1"', $html);
        
        echo json_encode(['found' => true, 'word' => $word, 'content' => $html]);
    }} else {{
        echo json_encode(['found' => false, 'word' => $word]);
    }}
}} catch (Exception $e) {{
    echo json_encode(['found' => false, 'error' => $e->getMessage()]);
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
    3. 按优先级提取发音音频（US -> BR/UK -> 首个音频）
    4. 返回可直接访问的 audio URL
    """
    print(f"Creating {PHP_AUDIO_FILE}...")
    common_lookup = build_php_common_lookup(
        param_name=['q', 'word'],
        empty_response_php="echo json_encode(['success' => false, 'error' => 'Query parameter is missing.']);",
        update_word_on_redirect=True,
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
        // --- Sound File Extraction Logic (Top-container scoped) ---
        // 只在词头容器 top-container 内查找，避免误匹配到例句音频。
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
            $topNodes = $xpath->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' top-container ')]");

            if ($topNodes && $topNodes->length > 0) {{
                $topNode = $topNodes->item(0);

                // Priority 1: pron-us
                $usNodes = $xpath->query(".//a[contains(concat(' ', normalize-space(@class), ' '), ' pron-us ') and @href]", $topNode);
                if ($usNodes && $usNodes->length > 0) {{
                    $candidate = $usNodes->item(0)->getAttribute('href');
                    if ($isAudioHref($candidate)) {{
                        $sound_file = $candidate;
                    }}
                }}

                // Priority 2: pron-br / pron-uk
                if (!$sound_file) {{
                    $brNodes = $xpath->query(".//a[(contains(concat(' ', normalize-space(@class), ' '), ' pron-br ') or contains(concat(' ', normalize-space(@class), ' '), ' pron-uk ')) and @href]", $topNode);
                    if ($brNodes && $brNodes->length > 0) {{
                        $candidate = $brNodes->item(0)->getAttribute('href');
                        if ($isAudioHref($candidate)) {{
                            $sound_file = $candidate;
                        }}
                    }}
                }}

                // Priority 3: first audio link in top-container only
                if (!$sound_file) {{
                    $allLinks = $xpath->query('.//a[@href]', $topNode);
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
        }}
        libxml_clear_errors();
    }}

    // --- JSON Response ---
    if ($sound_file) {{
        // Handle sound:// protocol and clean up path
        if (strpos($sound_file, 'sound://') === 0) {{
            $sound_file = substr($sound_file, 8);
        }}
        $sound_file = str_replace('\\\\', '/', $sound_file);
        $sound_file = ltrim($sound_file, '/');

        // Decode URL-encoded characters (like %23 for #) and get the basename
        $decoded_file = basename(urldecode($sound_file));
        $relative_audio_path = 'audio/' . $decoded_file;
        $absolute_audio_path = __DIR__ . '/' . $relative_audio_path;

        if (!file_exists($absolute_audio_path)) {{
            echo json_encode(['success' => false, 'word' => $word, 'error' => 'audio file not exist']);
            exit;
        }}

        $encoded_file = rawurlencode($decoded_file);
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
    builder.set_title("牛津高阶英汉双解词典")
    
    # 添加 Favicon
    builder.head_content.append('<link rel="icon" href="oaldpe.png" type="image/png">')
    
    builder.add_style("""
        @import url("oaldpe.css");
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
    builder.add_script("oaldpe-jquery.js")
    builder.add_script("oaldpe.js")
    
    builder.add_body_content("""
        <div id="content" class="oaldpe"></div>
    """)
    
    builder.add_inline_script("""
        async function search(word, updateHistory = true) {
            if (!word) return;
            
            const contentDiv = document.getElementById('content');
            
            // 简单 UI 反馈：鼠标变为等待状态
            document.body.style.cursor = 'wait';
            // 不清空 contentDiv，防止查询失败时丢失当前页面
            
            try {
                const response = await fetch(`search.php?q=${encodeURIComponent(word)}`);
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
                    
                    // 重新初始化词典脚本
                    if (window.oaldpeInit && typeof window.main === 'function') {
                        try {
                            const $content = $(contentDiv);
                            $content.find('*').off();
                            window.oaldpeInit.$allContainers = $content;
                            window.main();
                        } catch (e) { console.error(e); }
                    }
                } else {
                    // 查询失败 (未找到)：仅提示，不跳转，不破坏当前页面
                    if (updateHistory) {
                        // 用户主动搜索 -> 弹窗提示
                        alert(`未找到单词: "${word}"`);
                    } else {
                        // 历史回退 (popstate) -> 必须更新页面 (显示错误信息)
                        contentDiv.innerHTML = `<p style="text-align: center; margin-top: 50px; color: #999;">“${word}” 未找到</p>`;
                    }
                }
            } catch (e) {
                document.body.style.cursor = 'default';
                if (updateHistory) {
                    alert(`查询出错: ${e.message}`);
                } else {
                    contentDiv.innerHTML = `<p>Error: ${e.message}</p>`;
                }
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
    builder.set_title("牛津高阶英汉双解词典 - 浏览器")
    
    # 添加 Favicon
    builder.head_content.append('<link rel="icon" href="oaldpe.png" type="image/png">')
    
    builder.add_style("""
        @import url("oaldpe.css");
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
    builder.add_script("oaldpe-jquery.js")
    builder.add_script("oaldpe.js")
    
    builder.add_body_content("""
        <div id="search-container">
            <input type="text" id="search-box" placeholder="输入单词..." />
            <button id="search-btn">🔍</button>
        </div>
        <div id="content" class="oaldpe">
            <p style="color: #666; text-align: center; margin-top: 50px;">输入单词开始搜索。</p>
        </div>
    """)
    
    builder.add_inline_script("""
        async function search(word, updateHistory = true) {
            if (!word) return;
            
            const contentDiv = document.getElementById('content');
            
            // 简单 UI 反馈
            document.body.style.cursor = 'wait';
            const searchBtn = document.getElementById('search-btn');
            if (searchBtn) searchBtn.disabled = true;
            
            try {
                const response = await fetch(`search.php?q=${encodeURIComponent(word)}`);
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
                    
                    // 重新初始化词典交互逻辑
                    if (window.oaldpeInit && typeof window.main === 'function') {
                        try {
                            const $content = $(contentDiv);
                            $content.find('*').off(); 
                            window.oaldpeInit.$allContainers = $content;
                            window.main();
                        } catch (err) {
                            console.error('Error re-initializing dictionary script:', err);
                        }
                    }
                } else {
                    // 失败：仅提示，不跳转
                    if (updateHistory) {
                        alert(`未找到单词: "${word}"`);
                    } else {
                        // 历史回退遇到的错误，必须显示
                        contentDiv.innerHTML = `<p style="text-align: center; margin-top: 50px; color: #999;">“${word}” 未找到</p>`;
                    }
                }
            } catch (e) {
                document.body.style.cursor = 'default';
                if (searchBtn) searchBtn.disabled = false;
                
                if (updateHistory) {
                    alert(`错误: ${e.message}`);
                } else {
                    contentDiv.innerHTML = `<p style="text-align: center; color: red;">错误: ${e.message}</p>`;
                }
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
<FilesMatch "(\.(db|sqlite|sqlite3|log|ini)|^\.)">
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
        
    print("Moving root .png files to images/ (excluding favicon oaldpe.png)...")
    png_count = 0
    for filename in os.listdir(WWW_DIR):
        if (
            filename.lower().endswith('.png')
            and filename.lower() != 'oaldpe.png'
            and os.path.isfile(os.path.join(WWW_DIR, filename))
        ):
            src_path = os.path.join(WWW_DIR, filename)
            dst_path = os.path.join(images_dir, filename)
            shutil.move(src_path, dst_path)
            png_count += 1
            
    if png_count > 0:
        print(f"Moved {png_count} images to {images_dir}")

def copy_favicon():
    """确保 Favicon 存在于根目录（可覆盖更新）"""
    if os.path.exists('oaldpe.png'):
        print("Copying oaldpe.png to root directory (as favicon)...")
        shutil.copy('oaldpe.png', os.path.join(WWW_DIR, 'oaldpe.png'))
    else:
        print("Warning: oaldpe.png not found in current directory.")

def patch_js_image_logic():
    """Patch oaldpe.js to fix image path construction for simplified/traditional characters"""
    js_path = os.path.join(WWW_DIR, 'oaldpe.js')
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
        print("Patched oaldpe.js image logic.")

def copy_and_patch_assets():
    """复制静态资源 (CSS/JS) 并应用补丁"""
    print("Copying static assets...")
    for asset in ['oaldpe.css', 'oaldpe.js', 'oaldpe-jquery.js']:
        if os.path.exists(asset):
            if asset == 'oaldpe.js':
                # 应用 Patch：修复原始 JS 在动态加载环境下的 Bug
                print(f"Patching and copying {asset}...")
                with open(asset, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Patch 1: 修复导航查找 (children -> find)
                # 原始代码假设导航栏是直接子元素，但浏览器可能会改变 DOM 结构
                content = re.sub(
                    r"(\s*)const \$navbar = \$oaldpe\.children\('\.oaldpe-nav'\);",
                    r"\1const $navbar = $oaldpe.find('.oaldpe-nav');",
                    content
                )
                
                # Patch 2: 修复双重绑定问题 (Double Toggle)
                # 在初始化前先解绑所有事件，防止多次调用 main() 导致事件重复
                if "$oaldpe.find('*').off();" not in content:
                    content = re.sub(
                        r"(\s*)const \$oaldpe = \$\(this\);",
                        r"\1const $oaldpe = $(this);\n\1// Unbind all events from children to prevent double binding on re-initialization\n\1$oaldpe.find('*').off();",
                        content
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

def generate_all_files():
    """执行除解包和数据库转换外的所有生成步骤（PHP、HTML、静态资源、补丁、移动图片、htaccess等）"""
    # 3. 生成后端和前端代码
    create_search_php()
    create_search_audio_php()
    create_index_html()
    create_browser_html()
    
    # 4. 复制静态资源 (CSS/JS)
    copy_and_patch_assets()

    # 5. 整理图片资源 (将根目录图片移入 images/，但保留 favicon)
    organize_images()

    # 6. 确保 Favicon 存在于根目录（可覆盖更新）
    copy_favicon()

    create_htaccess()

    # Patch oaldpe.js to fix image path construction
    patch_js_image_logic()

def main():
    parser = argparse.ArgumentParser(description='Prepare Oxford Dictionary for Apache Deployment')
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