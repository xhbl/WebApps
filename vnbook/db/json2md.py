import json
import os

def json_to_md(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}")
        return

    print(f"Reading from {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Writing to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        for entry in data:
            # Line 1: ID Word
            f.write(f"{entry['id']} {entry['word']}\n")
            
            # Line 2: IPA
            if entry.get('ipas'):
                # Join with two spaces to match the style
                ipa_str = "  ".join([f"/{ipa}/" for ipa in entry['ipas']])
                f.write(f"- {ipa_str}\n")
            
            # Prepare definitions
            zh_parts = []
            en_parts = []
            
            for def_item in entry.get('definitions', []):
                pos = def_item['pos']
                meanings = def_item.get('meanings', {})
                
                # Helper to format list of strings into "s1","s2"
                def format_meanings(mlist):
                    # We assume the strings in JSON already contain necessary escapes (like \")
                    # because md2json.py preserves them. We just wrap them in quotes.
                    return ",".join([f'"{m}"' for m in mlist])

                if 'zh' in meanings and meanings['zh']:
                    zh_content = format_meanings(meanings['zh'])
                    zh_parts.append(f'{pos}[{zh_content}]')
                
                if 'en' in meanings and meanings['en']:
                    en_content = format_meanings(meanings['en'])
                    en_parts.append(f'{pos}[{en_content}]')
            
            # Line 3: ZH Definitions
            if zh_parts:
                f.write(f"- {'  '.join(zh_parts)}\n")
            
            # Line 4: EN Definitions
            if en_parts:
                f.write(f"- {'  '.join(en_parts)}\n")
            
            # Separator (blank line)
            f.write("\n")
    print("Done.")

if __name__ == '__main__':
    input_file = r'coca_vocab_20k_ce.json'
    output_file = r'coca_vocab_20k_clean.md'
    json_to_md(input_file, output_file)
