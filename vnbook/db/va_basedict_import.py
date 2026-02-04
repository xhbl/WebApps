import pymysql
import sys

def get_db_config(db_address='127.0.0.1:3306', user_credentials='root:_dbpassword'):
    """解析数据库地址和用户凭证并返回配置"""
    # 解析数据库地址
    if ':' in db_address:
        host, port = db_address.split(':', 1)
        port = int(port)
    else:
        host = db_address
        port = 3306
    
    # 解析用户名和密码
    if ':' in user_credentials:
        user, password = user_credentials.split(':', 1)
    else:
        user = user_credentials
        password = '_dbpassword'
    
    return {
        'host': host,
        'port': port,
        'user': user,
        'password': password,
        'database': 'va_basedict',
        'charset': 'utf8mb4',
        'cursorclass': pymysql.cursors.DictCursor
    }

def import_sql_file(db_config):
    """导入 SQL 文件并显示进度"""
    sql_file = 'va_basedict_data.sql'
    connection = None
    try:
        # 建立连接
        connection = pymysql.connect(**db_config)
        print(f"✅ 成功连接到数据库 {db_config['host']}:{db_config['port']}")
        print(f"📂 开始导入: {sql_file}")
        
        # 读取 SQL 文件
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # 分割 SQL 语句
        statements = [s.strip() for s in sql_content.split(';') if s.strip()]
        total_statements = len(statements)
        
        print(f"📊 总共 {total_statements} 条 SQL 语句\n")
        
        with connection.cursor() as cursor:
            for idx, statement in enumerate(statements, 1):
                try:
                    cursor.execute(statement)
                    
                    # 显示进度百分比
                    progress = (idx / total_statements) * 100
                    bar_length = 40
                    filled = int(bar_length * idx / total_statements)
                    bar = '█' * filled + '░' * (bar_length - filled)
                    
                    print(f"\r进度: [{bar}] {progress:.1f}% ({idx}/{total_statements})", end='', flush=True)
                    
                except Exception as e:
                    print(f"\n❌ SQL 执行错误 (第 {idx} 条): {e}")
                    print(f"   语句: {statement[:100]}...")
            
            connection.commit()
            print(f"\n\n✅ 成功执行 {total_statements} 条 SQL 语句")
            
            # 验证数据
            cursor.execute("SELECT COUNT(*) as count FROM words;")
            words_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM definitions;")
            definitions_count = cursor.fetchone()['count']
            
            print(f"\n📊 数据统计:")
            print(f"   words 表: {words_count} 条记录")
            print(f"   definitions 表: {definitions_count} 条记录")

    except FileNotFoundError:
        print(f"❌ 文件未找到: {sql_file}")
    except pymysql.Error as e:
        print(f"❌ 数据库错误: {e}")
    except Exception as e:
        print(f"❌ 错误: {e}")
    finally:
        if connection:
            connection.close()
            print("\n✅ 连接已关闭")

if __name__ == "__main__":
    # 支持命令行参数: ip:port user:password
    # 默认: 127.0.0.1:3306 root:_dbpassword
    # 密码可不输，只输入用户名则使用默认密码
    db_address = sys.argv[1] if len(sys.argv) > 1 else '127.0.0.1:3306'
    user_credentials = sys.argv[2] if len(sys.argv) > 2 else 'root:_dbpassword'
    db_config = get_db_config(db_address, user_credentials)
    import_sql_file(db_config)
