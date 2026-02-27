import http.server
import socketserver
import urllib.parse
import sqlite3
import re
import os

PORT = 8005

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        # 处理搜索请求
        if path.endswith('search.php') or path == '/search':
            query_params = urllib.parse.parse_qs(parsed_url.query)
            word = query_params.get('q', [''])[0]
            
            # 确定数据库路径
            if path.startswith('/medce'):
                db_path = os.path.join(os.path.dirname(__file__), 'medce', 'medce.db')
            else:
                db_path = os.path.join(os.path.dirname(__file__), 'medce.db')
            
            # 连接数据库
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            def escape_js_links(content):
                def fix_match(match):
                    word = match.group(1)
                    word = word.replace('\\', '')
                    return f"javascript:search('{word}')"
                content = re.sub(r'javascript:search\(\\?\'([^\']+)\\?\'\)', fix_match, content)
                return content
            
            def resolve(content, column):
                depth = 0
                while content and content.startswith('@@@LINK=') and depth < 3:
                    target = content[8:].strip()
                    cursor.execute(f"SELECT {column} FROM entries WHERE word = ? COLLATE NOCASE", (target,))
                    row = cursor.fetchone()
                    if row and row[0]:
                        content = row[0]
                    else:
                        escaped_target = target.replace('\\', '\\\\').replace('"', '\\"')
                        return f"请参考: <a href='javascript:search(\"{escaped_target}\")'>{target}</a>"
                    depth += 1
                return escape_js_links(content)
            
            # 执行查询
            cursor.execute("SELECT html_zh, html_en FROM entries WHERE word = ? COLLATE NOCASE LIMIT 1", (word,))
            res = cursor.fetchone()
            
            # 生成响应
            if res:
                zh, en = res
                zh_content = resolve(zh, 'html_zh') if zh else ''
                en_content = resolve(en, 'html_en') if en else ''
                
                zh_content = escape_js_links(zh_content)
                en_content = escape_js_links(en_content)
                
                response = '<div class="card">'
                if zh_content:
                    response += f"<div class='section'><span class='tag'>英汉医学大词典</span>{zh_content}</div>"
                if zh_content and en_content:
                    response += '<div class="divider"></div>'
                if en_content:
                    response += f"<div class='section'><span class='tag'>Dorland's Medical Dictionary</span>{en_content}</div>"
                response += '</div>'
            else:
                response = f"<div class='card' style='padding:20px; text-align: center;'>未找到: {word}</div>"
            
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(response.encode('utf-8'))
        else:
            # 其他请求使用默认的静态文件处理
            super().do_GET()

with socketserver.TCPServer(("localhost", PORT), MyHTTPRequestHandler) as httpd:
    print(f"服务器运行在 http://localhost:{PORT}")
    print("按 Ctrl+C 停止服务器")
    httpd.serve_forever()
