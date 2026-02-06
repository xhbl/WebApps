import json
import re
import os

def parse_definitions_line(line):
    line = line.strip()
    if line.startswith('- '):
        line = line[2:]
    
    results = []
    cursor = 0
    n = len(line)
    
    while cursor < n:
        # Find the start of the meanings list: ["
        start_bracket = line.find('["', cursor)
        if start_bracket == -1:
            break
        
        # POS is everything from cursor to start_bracket
        pos_raw = line[cursor:start_bracket].strip()
        
        # Find the closing "]
        # We look for "] followed by space or end of string
        search_pos = start_bracket + 2
        end_marker = -1
        
        while True:
            quote_close = line.find('"]', search_pos)
            if quote_close == -1:
                # No closing found, take till end
                end_marker = n
                break
            
            # Check what follows "]
            after = line[quote_close+2:]
            if not after or after[0].isspace():
                end_marker = quote_close
                break
            else:
                # Not the real end, continue
                search_pos = quote_close + 1
        
        # Extract content including quotes
        if end_marker == n:
            raw_content = line[start_bracket+1:]
        else:
            raw_content = line[start_bracket+1:end_marker+1]
        
        # Extract strings using regex to handle various separators
        meanings = []
        if raw_content:
            matches = re.findall(r'"((?:[^"\\]|\\.)*)"', raw_content)
            meanings = [m.strip() for m in matches]
            
        results.append({'pos': pos_raw, 'meanings': meanings})
        
        # Move cursor
        if end_marker == n:
            cursor = n
        else:
            cursor = end_marker + 2
        
    return results

def clean_english_text(text):
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text)
    # Remove space before punctuation
    text = re.sub(r'\s+([,.!?;:])', r'\1', text)
    # Fix spaces inside brackets/parentheses
    text = re.sub(r'([\[\(])\s+', r'\1', text)
    text = re.sub(r'\s+([\]\)])', r'\1', text)
    # Fix spaces around single quotes
    text = re.sub(r"(\S)\s+'(?=[\s,.!?;:]|$)", r"\1'", text)
    text = re.sub(r"(^|\s)'\s+([^\s])", r"\1'\2", text)
    return text.strip()

def parse_coca_file(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    entries = []
    current_entry = {}
    
    # Regex for ID line: number space word
    id_line_pattern = re.compile(r'^(\d+)\s+(.+)$')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
            
        match = id_line_pattern.match(line)
        if match:
            if current_entry:
                entries.append(current_entry)
            
            entry_id = int(match.group(1))
            word = match.group(2).strip()
            
            current_entry = {
                'id': entry_id,
                'word': word,
                'ipas': [],
                'definitions': []
            }
            
            # Next line: IPA
            if i + 1 < len(lines):
                ipa_line = lines[i+1].strip()
                if ipa_line.startswith('- /'):
                    ipa_content = ipa_line[2:]
                    ipas = re.findall(r'/([^/]+)/', ipa_content)
                    current_entry['ipas'] = ipas
                    i += 1
            
            # Next line: ZH Defs
            zh_defs = []
            if i + 1 < len(lines):
                zh_line = lines[i+1].strip()
                if zh_line.startswith('- ') and '["' in zh_line:
                    zh_defs = parse_definitions_line(zh_line)
                    i += 1
            
            # Next line: EN Defs
            en_defs = []
            if i + 1 < len(lines):
                en_line = lines[i+1].strip()
                if en_line.startswith('- ') and '["' in en_line:
                    en_defs = parse_definitions_line(en_line)
                    for item in en_defs:
                        item['meanings'] = [clean_english_text(m) for m in item['meanings']]
                    i += 1
            
            # Merge
            merged_defs = {}
            all_pos = []
            
            for item in zh_defs:
                pos = item['pos']
                if pos not in merged_defs:
                    merged_defs[pos] = {}
                    all_pos.append(pos)
                
                if 'zh' not in merged_defs[pos]:
                    merged_defs[pos]['zh'] = []
                merged_defs[pos]['zh'].extend(item['meanings'])
                
            for item in en_defs:
                pos = item['pos']
                if pos not in merged_defs:
                    merged_defs[pos] = {}
                    all_pos.append(pos)
                
                if 'en' not in merged_defs[pos]:
                    merged_defs[pos]['en'] = []
                merged_defs[pos]['en'].extend(item['meanings'])
            
            def_list = []
            for pos in all_pos:
                def_obj = {'pos': pos, 'meanings': merged_defs[pos]}
                def_list.append(def_obj)
            
            current_entry['definitions'] = def_list
            
        i += 1
        
    if current_entry:
        entries.append(current_entry)
        
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    input_file = r'coca_vocab_20k_ce.md'
    output_file = r'coca_vocab_20k_ce.json'
    parse_coca_file(input_file, output_file)
