import re
import json

def escape_sql_string(s):
    """安全的SQL字符串转义：只处理单引号（JSON本身已完整）"""
    s = s.replace("'", "''")  # 单引号转义为两个单引号
    return s

def md_to_sql(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 分割单词块
    blocks = re.split(r'\n(?=\d+\s+)', content.strip())
    
    sql_statements = [
        "SET NAMES utf8mb4;",
        "SET FOREIGN_KEY_CHECKS = 0;",
        "TRUNCATE TABLE `definitions`;",
        "TRUNCATE TABLE `words`;",
        "START TRANSACTION;",
        ""
    ]

    word_id_counter = 1
    processed_words = {}  # 改为字典，记录单词及其内容
    duplicate_count = 0  # 统计去重数量
    duplicate_details = []  # 记录重复的详细信息
    
    for block in blocks:
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if len(lines) < 3:
            continue

        # 1. 解析单词
        first_line_match = re.search(r'^\d+\s+(\S+)', lines[0])
        if not first_line_match:
            continue
        word_text = escape_sql_string(first_line_match.group(1))

        # 2. 解析音标：去掉 / / 定界符
        ipa_line = lines[1].lstrip('- ').strip()
        # 匹配所有在 / / 之间的内容
        raw_ipas = re.findall(r'/(.*?)/', ipa_line)
        # 如果正则没匹配到（比如格式不规范），则按空格尝试
        if not raw_ipas:
            raw_ipas = [ipa.strip('/') for ipa in re.split(r'\s{2,}', ipa_line) if ipa.strip()]
        
        ipas_json = json.dumps(raw_ipas, ensure_ascii=False)
        ipas_json_escaped = escape_sql_string(ipas_json)

        # 3. 解析词性和释义（中文和英文）
        def_line = lines[2].lstrip('- ').strip()
        # 匹配 词性. 和 紧随其后的 [数组]
        # 使用非贪婪匹配获取第一个出现的完整方括号内容
        pos_groups_zh = re.findall(r'([a-z\s\']+)\.(\[.*?\](?=\s+[a-z]|$))', def_line)
        
        # 如果上面的正则匹配失败（例如末尾没有更多词性），尝试更宽松的匹配
        if not pos_groups_zh:
            pos_groups_zh = re.findall(r'([a-z\s\']+)\.(\[.*?\])', def_line)

        # 解析英文定义（第4行）
        pos_groups_en = {}
        if len(lines) > 3:
            en_line = lines[3].lstrip('- ').strip()
            pos_groups_en_list = re.findall(r'([a-z\s\']+)\.(\[.*?\](?=\s+[a-z]|$))', en_line)
            if not pos_groups_en_list:
                pos_groups_en_list = re.findall(r'([a-z\s\']+)\.(\[.*?\])', en_line)
            # 构建词性到英文定义的映射
            for pos_str, meanings_raw in pos_groups_en_list:
                pos_groups_en[pos_str.strip()] = meanings_raw

        # 提取所有释义内容用于比较
        current_definitions = []
        for pos_str, meanings_raw in pos_groups_zh:
            try:
                meanings_list = json.loads(meanings_raw)
                current_definitions.append(f"{pos_str.strip()}: {meanings_raw}")
            except json.JSONDecodeError:
                continue
        
        definitions_str = " | ".join(current_definitions)
        
        # 跳过已处理过的单词（去重，大小写敏感）
        if word_text in processed_words:
            duplicate_count += 1
            # 记录重复详情
            prev_defs = processed_words[word_text]
            is_same = prev_defs == definitions_str
            duplicate_details.append({
                'word': word_text,
                'is_same': is_same,
                'prev_def': prev_defs[:100] if len(prev_defs) > 100 else prev_defs,
                'curr_def': definitions_str[:100] if len(definitions_str) > 100 else definitions_str
            })
            continue
        
        # 记录第一次出现的单词及其定义
        processed_words[word_text] = definitions_str

        sql_statements.append(f"INSERT INTO `words` (`id`, `word`, `ipas`) VALUES ({word_id_counter}, '{word_text}', '{ipas_json_escaped}');")

        # 记录已处理的词性，用于避免重复生成
        processed_pos = set()

        # 第一步：处理中文词性（meanings含"zh"）
        for pos_str, meanings_raw_zh in pos_groups_zh:
            pos = pos_str.strip() + '.'
            
            try:
                # 验证是否为合法JSON数组
                meanings_list_zh = json.loads(meanings_raw_zh)
                # 包装成 {"zh": [...]}
                meanings_obj = {"zh": meanings_list_zh}
                
                # 如果英文也有相同词性，则合并到同一条记录
                if pos_str.strip() in pos_groups_en:
                    meanings_raw_en = pos_groups_en[pos_str.strip()]
                    try:
                        meanings_list_en = json.loads(meanings_raw_en)
                        meanings_obj["en"] = meanings_list_en
                    except json.JSONDecodeError:
                        pass
                
                meanings_json = json.dumps(meanings_obj, ensure_ascii=False)
                # 使用安全的转义
                meanings_json_escaped = escape_sql_string(meanings_json)
                
                sql_statements.append(
                    f"INSERT INTO `definitions` (`word_id`, `pos`, `ipa_idx`, `meanings`) "
                    f"VALUES ({word_id_counter}, '{pos}', 0, '{meanings_json_escaped}');"
                )
                processed_pos.add(pos_str.strip())
            except json.JSONDecodeError:
                continue

        # 第二步：处理仅在英文出现的词性（meanings含"en"）
        for pos_str, meanings_raw_en in pos_groups_en_list:
            if pos_str.strip() not in processed_pos:
                pos = pos_str.strip() + '.'
                
                try:
                    meanings_list_en = json.loads(meanings_raw_en)
                    meanings_obj = {"en": meanings_list_en}
                    meanings_json = json.dumps(meanings_obj, ensure_ascii=False)
                    # 使用安全的转义
                    meanings_json_escaped = escape_sql_string(meanings_json)
                    
                    sql_statements.append(
                        f"INSERT INTO `definitions` (`word_id`, `pos`, `ipa_idx`, `meanings`) "
                        f"VALUES ({word_id_counter}, '{pos}', 0, '{meanings_json_escaped}');"
                    )
                except json.JSONDecodeError:
                    continue

        word_id_counter += 1
        sql_statements.append("")

    sql_statements.append("COMMIT;")
    sql_statements.append("SET FOREIGN_KEY_CHECKS = 1;")

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_statements))

    # 输出统计信息
    total_words = word_id_counter - 1
    print(f"\n{'='*60}")
    print(f"转换统计信息")
    print(f"{'='*60}")
    print(f"转换单词总数:    {total_words}")
    print(f"去重总数:        {duplicate_count}")
    print(f"源文件数据数:    {total_words + duplicate_count}")
    print(f"{'='*60}\n")
    
    # 分析重复数据
    same_count = sum(1 for d in duplicate_details if d['is_same'])
    diff_count = len(duplicate_details) - same_count
    
    print(f"去重详情分析")
    print(f"{'='*60}")
    print(f"完全重复(内容相同):   {same_count}")
    print(f"部分重复(内容不同):   {diff_count}")
    print(f"{'='*60}\n")
    
    # 如果有内容不同的重复，输出前 10 个
    if diff_count > 0:
        print(f"内容不同的重复单词示例(前10个):")
        print(f"{'-'*60}")
        for i, dup in enumerate([d for d in duplicate_details if not d['is_same']][:10]):
            print(f"\n{i+1}. 单词: '{dup['word']}'")
            print(f"   第一次: {dup['prev_def']}")
            print(f"   第二次: {dup['curr_def']}")
        print(f"{'-'*60}\n")
    
    print(f"成功！生成文件: {output_file}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    md_to_sql('coca_vocab_20k_ce.md', 'va_basedict_data.sql')