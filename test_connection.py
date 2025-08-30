#!/usr/bin/env python3
"""
Test script to verify ClickHouse connection and basic functionality.
"""

import os
import sys
from dotenv import load_dotenv
import clickhouse_connect


def test_connection():
    """Test the ClickHouse connection."""
    print("Testing ClickHouse Connection")
    print("=" * 30)
    
    # Load environment variables
    load_dotenv()
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("❌ .env file not found!")
        print("Please create a .env file based on env.example")
        return False
    
    try:
        # Create client

        print("CLICKHOUSE_HOST", os.getenv('CLICKHOUSE_HOST'))
        print("CLICKHOUSE_PORT", os.getenv('CLICKHOUSE_PORT'))
        print("CLICKHOUSE_USER", os.getenv('CLICKHOUSE_USER'))
        print("CLICKHOUSE_PASSWORD", os.getenv('CLICKHOUSE_PASSWORD'))
        print("CLICKHOUSE_DATABASE", os.getenv('CLICKHOUSE_DATABASE'))

        client = clickhouse_connect.get_client(
            host=os.getenv('CLICKHOUSE_HOST', 'localhost'),
            port=int(os.getenv('CLICKHOUSE_PORT', 8123)),
            username=os.getenv('CLICKHOUSE_USER', 'default'),
            password=os.getenv('CLICKHOUSE_PASSWORD', ''),
            database=os.getenv('CLICKHOUSE_DATABASE', 'default'),
            secure=os.getenv('CLICKHOUSE_SECURE', 'false').lower() == 'true'
        )
        
        # Test connection with a simple query
        result = client.query("SELECT version()")
        version = result.result_rows[0][0]
        print(f"✅ Connected successfully!")
        print(f"ClickHouse version: {version}")
        
        # Test basic queries
        print("\nTesting basic queries...")
        
        # Test SHOW DATABASES
        result = client.query("SHOW DATABASES")
        databases = [row[0] for row in result.result_rows]
        print(f"✅ Found {len(databases)} databases: {databases}")
        
        # Test SHOW TABLES for default database
        result = client.query("SHOW TABLES")
        tables = [row[0] for row in result.result_rows]
        print(f"✅ Found {len(tables)} tables in default database: {tables}")
        
        # Test DESCRIBE TABLE if tables exist
        if tables:
            table_name = tables[0]
            result = client.query(f"DESCRIBE TABLE {table_name}")
            columns = [row[0] for row in result.result_rows]
            print(f"✅ Table '{table_name}' has {len(columns)} columns: {columns}")
        
        client.close()
        print("\n🎉 All tests passed! You can now run the metadata extractor.")
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\nTroubleshooting tips:")
        print("1. Check if ClickHouse server is running")
        print("2. Verify your credentials in .env file")
        print("3. Ensure the host and port are correct")
        print("4. Check if your user has proper permissions")
        return False


if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
