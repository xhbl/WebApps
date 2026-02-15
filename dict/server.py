import http.server
import socketserver
import urllib.parse
import json
import os
import sqlite3
import re

PORT = 8000
# Serve current directory to simulate root
WEB_ROOT = os.getcwd()

class OxfordHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Simulate PHP backend
        if path.endswith('search.php'):
            query = urllib.parse.parse_qs(parsed_path.query)
            word = query.get('q', [''])[0] # index.html uses ?q=
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
            
        return super().do_GET()
    
    def lookup_in_db(self, word):
        # 动态查找数据库文件
        # 优先查找 oxford/oxford.db (新命名规范)
        # 其次查找 oxford/oaldpe.db (旧命名规范)
        db_candidates = [
            os.path.join(WEB_ROOT, 'oxford', 'oxford.db'),
            os.path.join(WEB_ROOT, 'oxford', 'oaldpe.db')
        ]
        
        db_path = None
        for p in db_candidates:
            if os.path.exists(p):
                db_path = p
                break
                
        if not db_path:
            return {'found': False, 'error': 'Database file not found. Please run prepare_apache_deployment.py first.'}

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
                # 1. Sound
                html = re.sub(r'sound://([^"\']+)', lambda m: 'audio/' + m.group(1).replace('\\', '/').lstrip('/'), html)
                # 2. Entry
                html = re.sub(r'entry://([^"\']+)', lambda m: "javascript:search('" + m.group(1).replace("'", "\\'") + "')", html)
                # 3. Images (Fix root pngs)
                html = re.sub(r'src="([^"\/]+\.png)"', r'src="images/\1"', html)
                
                return {'found': True, 'word': word, 'content': html}
            else:
                return {'found': False, 'word': word}
        except Exception as e:
            return {'found': False, 'error': str(e)}
        finally:
            if 'conn' in locals():
                conn.close()

print(f"Starting server at http://localhost:{PORT}")
print(f"Test URL: http://localhost:{PORT}/oxford/index.html?q=hello")

class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    pass

with ThreadingHTTPServer(("", PORT), OxfordHandler) as httpd:
    httpd.serve_forever()
