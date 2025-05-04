#!/usr/bin/env python
"""
Database Schema Inspector

This script connects to the SQLite database and prints out the schema
for specific tables to verify column names.
"""
import sqlite3
import os

def print_table_schema(db_path, table_names):
    """
    Prints the schema for specified tables in the SQLite database.
    
    Args:
        db_path (str): Path to the SQLite database file
        table_names (list): List of table names to check
    """
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return

    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if tables exist in the database
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        all_tables = [row[0] for row in cursor.fetchall()]
        
        print(f"All tables in database: {', '.join(all_tables)}\n")
        
        # Get and print schema for each requested table
        for table_name in table_names:
            if table_name in all_tables:
                print(f"Schema for table '{table_name}':")
                cursor.execute(f"PRAGMA table_info({table_name});")
                columns = cursor.fetchall()
                
                # Print column details in a formatted way
                print(f"{'Column Name':<20} {'Type':<15} {'Nullable':<10} {'Default':<15} {'Primary Key'}")
                print("-" * 75)
                for col in columns:
                    col_id, name, type_, not_null, default_val, pk = col
                    nullable = "NOT NULL" if not_null else "NULL"
                    print(f"{name:<20} {type_:<15} {nullable:<10} {str(default_val):<15} {pk}")
                print("\n")
            else:
                print(f"Table '{table_name}' does not exist in the database.\n")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    db_path = "G:\\LM-Studio-Agents\\instance\\lmstudio_agents.sqlite"
    tables_to_check = [
        "blog_post_sections", 
        "blog_post_versions",
        "blog_posts",
        "blog_post_seo_data",
        "keywords",
        "keyword_blog_association",
        "website_metrics",
        "page_analytics"
    ]
    
    print_table_schema(db_path, tables_to_check)

