import http.server
import socketserver
import urllib.parse
import json
import os
import sqlite3
import re

PORT = 8001  # 使用不同的端口以避免与 cdepe_server 冲突
# Serve current directory to simulate root
WEB_ROOT = os.getcwd()

class MerriamHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        # Simulate PHP backend
        if path.endswith('search.php'):
            query = urllib.parse.parse_qs(parsed_path.query)
            word = query.get('q', [''])[0]  # index.html uses ?q=
            if not word:
                word = query.get('word', [''])[0]

            print(f"Searching for: {word}")
            response_data = self.lookup_in_db(word)

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            return

        # Also handle search_audio.php if needed
        if path.endswith('search_audio.php'):
            query = urllib.parse.parse_qs(parsed_path.query)
            word = query.get('word', [''])[0]
            
            print(f"Searching audio for: {word}")
            response_data = self.lookup_audio_in_db(word)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            return

        return super().do_GET()

    def lookup_in_db(self, word):
        # 动态查找数据库文件
        # 优先查找 merriam/merriam.db (新命名规范)
        # 其次查找 merriam/maldpe.db (旧命名规范，如果存在)
        db_candidates = [
            os.path.join(WEB_ROOT, 'merriam', 'merriam.db'),
            os.path.join(WEB_ROOT, 'merriam', 'maldpe.db')
        ]

        db_path = None
        for p in db_candidates:
            if os.path.exists(p):
                db_path = p
                break

        if not db_path:
            return {'found': False, 'error': 'Database file not found. Please run maldpe_deploy.py first.'}

        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            cursor.execute('SELECT content FROM dictionary WHERE word = ?', (word,))
            row = cursor.fetchone()

            if row:
                html = row[0]

                # Handle redirects
                if html.startswith('@@@LINK='):
                    target = html[8:].strip()
                    cursor.execute('SELECT content FROM dictionary WHERE word = ?', (target,))
                    row2 = cursor.fetchone()
                    if row2:
                        html = row2[0]

                # Apply PHP-like regex replacements
                # 1. Entry links (保持与 PHP 一致的处理)
                html = re.sub(r'entry://([^"\']+)', lambda m: "javascript:search('" + m.group(1).replace("'", "\\'") + "')", html)
                
                # 2. Sound links - 移除 sound:// 前缀（保持原始路径）
                # 根据 maldpe.js 的处理，sound:// 前缀被直接移除
                html = re.sub(r'sound://([^"\']+)', lambda m: m.group(1).replace('\\', '/').lstrip('/'), html)

                # 3. Remove MDX wrapper tags and in-entry link/script tags (与 PHP 一致)
                html = re.sub(r'</?body[^>]*>', '', html, flags=re.IGNORECASE)
                html = re.sub(r'</?body-content[^>]*>', '', html, flags=re.IGNORECASE)
                html = re.sub(r'<link[^>]*>', '', html, flags=re.IGNORECASE)
                html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.IGNORECASE | re.DOTALL)

                # 4. Images - 注意：根据之前的修改，我们没有移动根目录图片到 images/ 子目录
                # 因此不应用图片路径修正，保持原始路径
                # 如果需要，可以取消下面的注释
                # html = re.sub(r'src="([^"\/]+\.(png|jpg|jpeg|gif|webp|svg))"', r'src="images/\1"', html, flags=re.IGNORECASE)

                # 5. Fix absolute path for sound.png (remove leading slash)
                html = re.sub(r'src=["\']/sound\.png["\']', 'src="sound.png"', html, flags=re.IGNORECASE)
                # 6. Fix CSS url(/sound.png)
                html = re.sub(r'url\(["\']?/sound\.png["\']?\)', 'url(sound.png)', html, flags=re.IGNORECASE)

                # 7. 修正音频文件扩展名：.spx -> .mp3
                html = re.sub(r'\.spx(["\'])', r'.mp3\1', html, flags=re.IGNORECASE)

                return {'found': True, 'word': word, 'content': html}
            else:
                return {'found': False, 'word': word}
        except Exception as e:
            return {'found': False, 'error': str(e)}
        finally:
            if 'conn' in locals():
                conn.close()

    def lookup_audio_in_db(self, word):
        """模拟 search_audio.php 的功能，提取音频文件路径"""
        # 使用相同的数据库查找逻辑
        db_candidates = [
            os.path.join(WEB_ROOT, 'merriam', 'merriam.db'),
            os.path.join(WEB_ROOT, 'merriam', 'maldpe.db')
        ]

        db_path = None
        for p in db_candidates:
            if os.path.exists(p):
                db_path = p
                break

        if not db_path:
            return {'found': False, 'error': 'Database file not found.'}

        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            cursor.execute('SELECT content FROM dictionary WHERE word = ?', (word,))
            row = cursor.fetchone()

            if row:
                html = row[0]
                
                # Handle redirects
                if html.startswith('@@@LINK='):
                    target = html[8:].strip()
                    cursor.execute('SELECT content FROM dictionary WHERE word = ?', (target,))
                    row2 = cursor.fetchone()
                    if row2:
                        html = row2[0]
                
                # 简化版音频提取逻辑：查找第一个 sound:// 链接
                sound_match = re.search(r'sound://([^"\']+)', html)
                if sound_match:
                    audio_path = sound_match.group(1).replace('\\', '/').lstrip('/')
                    # 修正音频文件扩展名：.spx -> .mp3
                    audio_path = re.sub(r'\.spx$', '.mp3', audio_path, flags=re.IGNORECASE)
                    return {
                        'found': True,
                        'word': word,
                        'audio': audio_path,
                        'url': audio_path  # 直接返回路径，因为 sound:// 前缀已移除
                    }
                else:
                    return {'found': False, 'word': word, 'error': 'No audio found'}
            else:
                return {'found': False, 'word': word}
        except Exception as e:
            return {'found': False, 'error': str(e)}
        finally:
            if 'conn' in locals():
                conn.close()

print(f"Starting Merriam-Webster server at http://localhost:{PORT}")
print(f"Test URL: http://localhost:{PORT}/merriam/index.html?q=hello")
print(f"Audio test URL: http://localhost:{PORT}/merriam/search_audio.php?word=hello")
print("Press Ctrl+C to stop the server")

class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    pass

with ThreadingHTTPServer(("", PORT), MerriamHandler) as httpd:
    httpd.serve_forever()