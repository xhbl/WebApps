
import os
import sqlite3
import sys

# --- MDX/MDD Library Import ---
try:
    from readmdict import MDX
except ImportError:
    try:
        from mdict_utils.base.readmdict import MDX
    except ImportError:
        print("Error: Could not import MDX library. Please ensure 'readmdict' is installed.")
        sys.exit(1)

# --- Configuration ---
MDX_FILE = 'oaldpe.mdx'
OUTPUT_DIR = 'oxford'
DB_FILE = os.path.join(OUTPUT_DIR, 'oxford.db')

# --- Conversion Function (copied and adapted from the main script) ---
def convert_mdx_to_sqlite():
    """
    Converts an MDX dictionary file to an SQLite database in the 'oxford' directory.
    """
    # Ensure output directory exists
    print(f"Ensuring output directory '{OUTPUT_DIR}' exists...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print(f"Converting {MDX_FILE} to {DB_FILE}...")
    
    if os.path.exists(DB_FILE):
        print(f"Removing existing database: {DB_FILE}")
        try:
            os.remove(DB_FILE)
        except PermissionError:
            print(f"Error: Cannot remove {DB_FILE}. It might be in use by another process.")
            return

    if not os.path.exists(MDX_FILE):
        print(f"Error: {MDX_FILE} not found in the current directory.")
        return

    try:
        mdx = MDX(MDX_FILE)
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        print("Creating table 'dictionary' with 'word' (COLLATE NOCASE) and 'content' columns...")
        cursor.execute('CREATE TABLE dictionary (word TEXT PRIMARY KEY COLLATE NOCASE, content TEXT)')
        
        total_entries = 0
        batch = []
        BATCH_SIZE = 5000 
        
        print("Starting data insertion (this may take a while)...")
        
        for key, value in mdx.items():
            try:
                word = key.decode('utf-8').strip()
                # Skip empty words
                if not word:
                    continue
                
                # Attempt to decode content, handling potential encoding issues
                try:
                    content = value.decode('utf-8')
                except UnicodeDecodeError:
                    try:
                        content = value.decode('utf-16')
                    except UnicodeDecodeError:
                        # If both fail, skip this entry
                        print(f"Warning: Could not decode content for word: {word}")
                        continue 
                
                batch.append((word, content))
                
                # Insert in batches for performance
                if len(batch) >= BATCH_SIZE:
                    cursor.executemany('INSERT OR REPLACE INTO dictionary (word, content) VALUES (?, ?)', batch)
                    total_entries += len(batch)
                    batch = []
                    print(f"Processed {total_entries} entries...")
                        
            except Exception as e:
                # Skip entries that cause other errors during processing
                print(f"Warning: Skipping an entry due to error: {e}")
                continue

        # Insert any remaining entries
        if batch:
            cursor.executemany('INSERT OR REPLACE INTO dictionary (word, content) VALUES (?, ?)', batch)
            total_entries += len(batch)
            
        conn.commit()
        conn.close()
        print(f"\nSuccessfully created database '{DB_FILE}' with {total_entries} total entries.")

    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# --- Main Execution Block ---
if __name__ == "__main__":
    print(f"--- MDX to SQLite Converter ---")
    convert_mdx_to_sqlite()
    print(f"-----------------------------")
