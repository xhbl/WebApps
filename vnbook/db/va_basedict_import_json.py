import pymysql
import sys
import json

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

def import_json_file(db_config):
    """导入 JSON 文件并显示进度"""
    json_file = 'coca_vocab_20k_ce.json'
    connection = None
    try:
        # 建立连接
        connection = pymysql.connect(**db_config)
        print(f"✅ 成功连接到数据库 {db_config['host']}:{db_config['port']}")
        print(f"📂 开始导入: {json_file}")
        
        # 读取 JSON 文件
        with open(json_file, 'r', encoding='utf-8') as f:
            vocab_data = json.load(f)
        
        total_words = len(vocab_data)
        print(f"📊 读取词条总数: {total_words}\n")
        
        with connection.cursor() as cursor:
            successful_words = 0
            successful_defs = 0
            failed = 0
            
            # 清空表（可选）
            print("清理旧数据...")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            cursor.execute("TRUNCATE TABLE `definitions`;")
            cursor.execute("TRUNCATE TABLE `words`;")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
            
            print(f"开始导入数据...\n")
            
            for word_idx, word_entry in enumerate(vocab_data, 1):
                try:
                    word_id = word_entry['id']
                    word = word_entry['word'].replace("'", "''")  # SQL转义
                    ipas = word_entry.get('ipas', [])
                    
                    # JSON转义
                    ipas_json = json.dumps(ipas, ensure_ascii=False).replace("'", "''")
                    
                    # 插入words表
                    insert_word_sql = (
                        f"INSERT INTO `words` (`id`, `word`, `ipas`) "
                        f"VALUES ({word_id}, '{word}', '{ipas_json}');"
                    )
                    cursor.execute(insert_word_sql)
                    successful_words += 1
                    
                    # 处理definitions
                    definitions = word_entry.get('definitions', [])
                    for definition in definitions:
                        pos = definition.get('pos', '').replace("'", "''")
                        meanings = definition.get('meanings', {})
                        
                        # 构建meanings JSON对象
                        meanings_obj = {}
                        if 'zh' in meanings:
                            meanings_obj['zh'] = meanings['zh']
                        if 'en' in meanings:
                            meanings_obj['en'] = meanings['en']
                        
                        meanings_json = json.dumps(meanings_obj, ensure_ascii=False).replace("'", "''")
                        
                        # 插入definitions表
                        insert_def_sql = (
                            f"INSERT INTO `definitions` (`word_id`, `pos`, `ipa_idx`, `meanings`) "
                            f"VALUES ({word_id}, '{pos}', 0, '{meanings_json}');"
                        )
                        cursor.execute(insert_def_sql)
                        successful_defs += 1
                    
                    # 显示进度
                    progress = (word_idx / total_words) * 100
                    bar_length = 40
                    filled = int(bar_length * word_idx / total_words)
                    bar = '█' * filled + '░' * (bar_length - filled)
                    
                    print(f"\r进度: [{bar}] {progress:.1f}% ({word_idx}/{total_words})", end='', flush=True)
                    
                except Exception as e:
                    failed += 1
                    print(f"\n❌ 导入错误 (单词 {word_idx}): {e}")
                    if word_idx <= 5:
                        print(f"   词条: {word_entry.get('word', 'N/A')}")
            
            connection.commit()
            print(f"\n\n✅ 导入完成")
            print(f"   成功导入words: {successful_words} 条")
            print(f"   成功导入definitions: {successful_defs} 条")
            if failed > 0:
                print(f"⚠️  失败: {failed} 条")
            
            # 验证数据
            cursor.execute("SELECT COUNT(*) as count FROM words;")
            words_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM definitions;")
            definitions_count = cursor.fetchone()['count']
            
            print(f"\n📊 数据库状态:")
            print(f"   words 表: {words_count} 条记录")
            print(f"   definitions 表: {definitions_count} 条记录")

    except FileNotFoundError:
        print(f"❌ 文件未找到: {json_file}")
    except json.JSONDecodeError as e:
        print(f"❌ JSON 解析错误: {e}")
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
    import_json_file(db_config)
