import pymysql
import sys
import json
import argparse
import getpass

def get_db_config(args):
    """从 argparse 参数构建数据库配置"""
    password = args.password
    
    if not password:
        password = getpass.getpass('请输入数据库密码: ')
    
    return {
        'host': args.host,
        'port': args.port,
        'user': args.user,
        'password': password,
        'database': 'va_basedict',
        'charset': 'utf8mb4',
        'cursorclass': pymysql.cursors.DictCursor
    }

def import_json_file(db_config, json_file, domain_key=''):
    """导入 JSON 文件并显示进度"""
    words_table = f"words_{domain_key}" if domain_key else "words"
    definitions_table = f"definitions_{domain_key}" if domain_key else "definitions"

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
            cursor.execute(f"TRUNCATE TABLE `{definitions_table}`;")
            cursor.execute(f"TRUNCATE TABLE `{words_table}`;")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
            
            print(f"开始导入数据...\n")
            
            for word_idx, word_entry in enumerate(vocab_data, 1):
                try:
                    word_id = word_entry['id']
                    word = word_entry['word'].replace("'", "''")  # SQL转义
                    ipas = word_entry.get('ipas', [])
                    
                    # JSON转义
                    # 关键修复：确保所有反斜杠被转义。
                    # Python的json.dumps会转义 \ 为 \\，但在构建SQL字符串时，MySQL需要 \\\\ 才能存入一个 \。
                    # 同时单引号 ' 需要转义为 ''。
                    ipas_json = json.dumps(ipas, ensure_ascii=False).replace("\\", "\\\\").replace("'", "''")
                    
                    # 插入words表
                    insert_word_sql = (
                        f"INSERT INTO `{words_table}` (`id`, `word`, `ipas`) "
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
                        
                        # 关键修复：同上，转义反斜杠
                        meanings_json = json.dumps(meanings_obj, ensure_ascii=False).replace("\\", "\\\\").replace("'", "''")
                        
                        # 插入definitions表
                        insert_def_sql = (
                            f"INSERT INTO `{definitions_table}` (`word_id`, `pos`, `ipa_idx`, `meanings`) "
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
                    print(f"\n❌ 导入错误 (单词 {word_idx}, ID: {word_id}): {e}")
                    if isinstance(e, pymysql.err.DataError) and e.args[0] == 1264:
                         print("   提示: 这可能是因为数据库的 ID 字段类型太小 (例如 SMALLINT)。\n   建议将 `words` 表的 `id` 字段修改为 `INT` 或 `MEDIUMINT`。")
                    
                    if word_idx <= 5 or failed <= 5:
                        print(f"   词条: {word_entry.get('word', 'N/A')}")
            
            connection.commit()
            print(f"\n\n✅ 导入完成")
            print(f"   成功导入words: {successful_words} 条")
            print(f"   成功导入definitions: {successful_defs} 条")
            if failed > 0:
                print(f"⚠️  失败: {failed} 条")
            
            # 验证数据
            cursor.execute(f"SELECT COUNT(*) as count FROM `{words_table}`;")
            words_count = cursor.fetchone()['count']
            
            cursor.execute(f"SELECT COUNT(*) as count FROM `{definitions_table}`;")
            definitions_count = cursor.fetchone()['count']
            
            print(f"\n📊 数据库状态:")
            print(f"   {words_table} 表: {words_count} 条记录")
            print(f"   {definitions_table} 表: {definitions_count} 条记录")

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
    parser = argparse.ArgumentParser(
        description='VA BaseDict 数据导入工具',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    # 数据库连接参数
    parser.add_argument('--host', default='127.0.0.1', help='数据库主机地址 (默认: 127.0.0.1)')
    parser.add_argument('--port', type=int, default=3306, help='数据库端口 (默认: 3306)')
    parser.add_argument('-u', '--user', default='root', help='用户名 (默认: root)')
    parser.add_argument('-p', '--password', default='_dbpassword', help='数据库密码 (默认: _dbpassword)')
    
    # 业务参数
    parser.add_argument('-f', '--file', default='va_basedict.json', help='要导入的 JSON 文件路径')
    parser.add_argument('-k', '--key', default='', help='目标数据库领域键名')
    
    args = parser.parse_args()
    
    db_config = get_db_config(args)
    import_json_file(db_config, args.file, args.key)
