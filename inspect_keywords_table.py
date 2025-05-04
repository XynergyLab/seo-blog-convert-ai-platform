#!/usr/bin/env python
"""
Temporary script to inspect the schema of the keywords table.
This script outputs column names, types, and constraints.
"""
import os
import sys
from sqlalchemy import inspect, create_engine
from sqlalchemy.orm import declarative_base

# Set up path to find app modules
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Determine database URI
# For development, we assume SQLite
instance_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance')
db_path = os.path.join(instance_path, 'lmstudio_agents.sqlite')

# Create SQLite engine
db_uri = f"sqlite:///{db_path}"
engine = create_engine(db_uri)

# Create inspector
inspector = inspect(engine)

# Print database connection info
print(f"Connected to database: {db_uri}")
print("=" * 80)

# Get table information for keywords table
if 'keywords' in inspector.get_table_names():
    print(f"Table 'keywords' exists in the database")
    print("-" * 80)
    
    # Get columns
    print("\nCOLUMNS:")
    print("-" * 40)
    for column in inspector.get_columns('keywords'):
        nullable_str = "NULL" if column['nullable'] else "NOT NULL"
        default = f", DEFAULT: {column['default']}" if column['default'] is not None else ""
        print(f"{column['name']}: {column['type']} ({nullable_str}{default})")
    
    # Get primary key
    print("\nPRIMARY KEY:")
    print("-" * 40)
    pk = inspector.get_pk_constraint('keywords')
    print(f"Constraint name: {pk.get('name', 'Unnamed')}")
    print(f"Columns: {', '.join(pk['constrained_columns'])}")
    
    # Get foreign keys
    print("\nFOREIGN KEYS:")
    print("-" * 40)
    fks = inspector.get_foreign_keys('keywords')
    if fks:
        for fk in fks:
            print(f"Constraint name: {fk.get('name', 'Unnamed')}")
            print(f"Referenced table: {fk['referred_table']}")
            for i, col in enumerate(fk['constrained_columns']):
                print(f"  {col} -> {fk['referred_table']}.{fk['referred_columns'][i]}")
    else:
        print("No foreign keys")
    
    # Get indices
    print("\nINDICES:")
    print("-" * 40)
    indices = inspector.get_indexes('keywords')
    if indices:
        for index in indices:
            unique_str = "UNIQUE " if index['unique'] else ""
            print(f"{unique_str}Index: {index['name']} on columns: {', '.join(index['column_names'])}")
    else:
        print("No indices")
    
    # Get associations (joining tables)
    print("\nASSOCIATION TABLES:")
    print("-" * 40)
    for table_name in inspector.get_table_names():
        if 'keyword' in table_name and table_name != 'keywords':
            print(f"Found potential association table: {table_name}")
            # Check if this table references keywords
            fks = inspector.get_foreign_keys(table_name)
            references_keywords = any(fk['referred_table'] == 'keywords' for fk in fks)
            if references_keywords:
                print(f"  Confirmed association table: {table_name}")
                print(f"  Columns:")
                for column in inspector.get_columns(table_name):
                    print(f"    {column['name']}: {column['type']}")
else:
    print("Table 'keywords' does not exist in the database!")

print("\nDone.")

