import http.server
import socketserver
import urllib.parse
import json
import os
import sqlite3
import re

PORT = 8002  # 使用不同的端口以避免与其他服务器冲突
# Serve current directory to simulate root
WEB_ROOT = os.getcwd()

class LongmanHandler(http.server.SimpleHTTPRequestHandler):
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
        # 处理锚点 (Handle anchors)
        if '#' in word:
            word = word.split('#')[0]
        word = word.strip()
        
        # 动态查找数据库文件
        # 查找 longman/longman.db
        db_candidates = [
            os.path.join(WEB_ROOT, 'longman', 'longman.db')
        ]

        db_path = None
        for p in db_candidates:
            if os.path.exists(p):
                db_path = p
                break

        if not db_path:
            return {'found': False, 'error': 'Database not found'}

        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            cursor.execute('SELECT content FROM dictionary WHERE word = ?', (word,))
            row = cursor.fetchone()

            if row:
                html = row[0]
                raw_html = html

                # 处理重定向 (Handle redirects @@@LINK=)
                if html.startswith('@@@LINK='):
                    target = html[8:].strip()
                    cursor.execute('SELECT content FROM dictionary WHERE word = ?', (target,))
                    row2 = cursor.fetchone()
                    if row2:
                        html = row2[0]
                        raw_html = html

                # Apply PHP-like regex replacements
                # 1. Entry links (保持与 PHP 一致的处理)
                html = re.sub(r'entry://([^"\']+)', lambda m: "javascript:search('" + m.group(1).replace("'", "\\'") + "')", html)
                
                # 2. Remove </body> tags
                html = re.sub(r'</body>', '', html, flags=re.IGNORECASE)
                
                # 3. Remove </body-content> tags
                html = re.sub(r'</body-content[^>]*>', '', html, flags=re.IGNORECASE)
                
                # 4. Remove <link> tags
                html = re.sub(r'<link[^>]*>', '', html, flags=re.IGNORECASE)
                
                # 5. Remove <script> tags
                html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.IGNORECASE | re.DOTALL)
                
                # 6. Fix absolute path for sound.png
                html = re.sub(r'(["\'\(])/sound\.png(["\'\)])', r'\1sound.png\2', html)
                
                # 7. Fix sound:// protocol
                html = re.sub(r'sound://([^"\']+)', r'\1', html)
                
                # 如果处理后html为空但原始html不为空，则使用原始html
                if html == '' and raw_html != '':
                    html = raw_html

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
        # 处理锚点 (Handle anchors)
        if '#' in word:
            word = word.split('#')[0]
        word = word.strip()
        
        # 使用相同的数据库查找逻辑
        db_candidates = [
            os.path.join(WEB_ROOT, 'longman', 'longman.db')
        ]

        db_path = None
        for p in db_candidates:
            if os.path.exists(p):
                db_path = p
                break

        if not db_path:
            return {'success': False, 'error': 'Database not found'}

        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            cursor.execute('SELECT content FROM dictionary WHERE word = ?', (word,))
            row = cursor.fetchone()

            if row:
                html = row[0]
                
                # 处理重定向 (Handle redirects @@@LINK=)
                if html.startswith('@@@LINK='):
                    target = html[8:].strip()
                    cursor.execute('SELECT content FROM dictionary WHERE word = ?', (target,))
                    row2 = cursor.fetchone()
                    if row2:
                        html = row2[0]
            
            sound_file = None
            
            if row:
                # --- Sound File Extraction Logic (LDOCE6 specific) ---
                # 提取音频文件路径
                
                def is_audio_href(href):
                    if not href:
                        return False
                    if href.startswith('sound://'):
                        return True
                    return bool(re.search(r'\.(mp3|wav|spx)(?:$|[?#])', href, re.IGNORECASE))
                
                # 尝试使用正则表达式提取音频链接
                # 首先尝试从 <a> 标签中提取
                audio_links = re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>', html)
                for link in audio_links:
                    if is_audio_href(link):
                        sound_file = link
                        break
                
                # 如果没有找到，尝试直接查找 sound:// 链接
                if not sound_file:
                    sound_match = re.search(r'sound://([^"\']+)', html)
                    if sound_match:
                        sound_file = 'sound://' + sound_match.group(1)
            
            # --- JSON Response ---
            if sound_file:
                # Normalize protocol/path and avoid duplicating audio/ prefix
                if sound_file.startswith('sound://'):
                    sound_file = sound_file[8:]
                sound_file = sound_file.replace('\\', '/')
                sound_file = sound_file.lstrip('/')

                relative_audio_path = sound_file
                longman_dir = os.path.join(WEB_ROOT, 'longman')
                absolute_audio_path = os.path.join(longman_dir, relative_audio_path)

                # 检查文件是否存在，如果不存在，尝试修正路径
                if not os.path.exists(absolute_audio_path):
                    # 尝试不同的路径组合
                    possible_paths = [
                        os.path.join(longman_dir, 'audio', os.path.basename(sound_file)),
                        os.path.join(longman_dir, 'sounds', os.path.basename(sound_file)),
                        os.path.join(longman_dir, os.path.basename(sound_file))
                    ]
                    
                    for path in possible_paths:
                        if os.path.exists(path):
                            absolute_audio_path = path
                            relative_audio_path = os.path.relpath(path, longman_dir).replace('\\', '/')
                            break
                
                if not os.path.exists(absolute_audio_path):
                    return {'success': False, 'word': word, 'error': 'audio file not exist'}
                
                # 构建完整的URL
                base_audio_url = f'http://localhost:{PORT}/longman/'
                encoded_segments = [segment.replace(' ', '%20') for segment in relative_audio_path.split('/')]
                encoded_file = '/'.join(encoded_segments)
                full_url = base_audio_url + encoded_file
                
                return {
                    'success': True,
                    'word': word,
                    'url': full_url
                }
            else:
                return {'success': False, 'word': word}
        except Exception as e:
            return {'success': False, 'error': str(e)}
        finally:
            if 'conn' in locals():
                conn.close()

print(f"Starting Longman server at http://localhost:{PORT}")
print(f"Test URL: http://localhost:{PORT}/longman/index.html?q=hello")
print(f"Audio test URL: http://localhost:{PORT}/longman/search_audio.php?word=hello")
print("Press Ctrl+C to stop the server")

class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    pass

with ThreadingHTTPServer(("", PORT), LongmanHandler) as httpd:
    httpd.serve_forever()
