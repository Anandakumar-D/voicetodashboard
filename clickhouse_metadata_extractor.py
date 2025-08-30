#!/usr/bin/env python3
"""
ClickHouse Metadata Extractor

This script connects to a ClickHouse database and extracts all metadata including:
- Databases
- Schemas within each database
- Tables within each database
- Column information for each table

The extracted metadata is saved to a structured JSON file.
"""

import json
import os
import sys
import time
import argparse
from typing import Dict, List, Any
from dotenv import load_dotenv
import clickhouse_connect
import google.generativeai as genai


class GeminiLLMAnalyzer:
    """Uses Google Gemini to analyze and generate column definitions."""

    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")

        # Prefer a modern default if not set
        model_name = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)

    @staticmethod
    def _response_to_text(response) -> str:
        """Robustly extract text from google-generativeai responses."""
        texts = []

        # New SDK shape: response.candidates[*].content.parts[*].text
        try:
            if getattr(response, "candidates", None):
                for cand in response.candidates:
                    content = getattr(cand, "content", None)
                    if content and getattr(content, "parts", None):
                        for p in content.parts:
                            t = getattr(p, "text", None)
                            if isinstance(t, str) and t.strip():
                                texts.append(t.strip())
        except Exception:
            pass
        
        # Fallback for older SDK shapes or different response formats
        if not texts and getattr(response, "parts", None):
            for p in response.parts:
                t = getattr(p, "text", None)
                if isinstance(t, str) and t.strip():
                    texts.append(t.strip())

        return "\n".join(texts).strip()

    def generate_column_definition(
        self,
        table_name: str,
        column_name: str,
        column_type: str,
        database_name: str = None,
        schema_name: str = None
    ) -> str:
        prompt = f"""
Analyze this database column and provide a clear, concise definition of what this column likely represents.

Database: {database_name}
Schema: {schema_name}
Table: {table_name}
Column Name: {column_name}
Column Type: {column_type}

Provide a brief, professional definition (1 to 2 sentences) focusing on business meaning rather than technical details.

Definition:
""".strip()

        try:
            response = self.model.generate_content(prompt)
            text = self._response_to_text(response)
            return text if text else f"Column {column_name} of type {column_type}"
        except Exception as e:
            print(f"Error generating definition for {table_name}.{column_name}: {e}")
            return f"Column {column_name} of type {column_type}"
    
    def analyze_table_structure(self, table_name: str, columns: List[Dict], 
                              database_name: str = None, schema_name: str = None) -> List[Dict]:
        """Analyze all columns in a table and add definitions."""
        print(f"      Analyzing table structure for: {table_name}")
        
        for column in columns:
            if not column.get('comment') or column['comment'].strip() == '':
                print(f"        Generating definition for column: {column['name']}")
                definition = self.generate_column_definition(
                    table_name=table_name,
                    column_name=column['name'],
                    column_type=column['type'],
                    database_name=database_name,
                    schema_name=schema_name
                )
                column['ai_definition'] = definition
                
                # Add a small delay to avoid rate limiting
                time.sleep(0.5)
            else:
                column['ai_definition'] = column['comment']
        
        return columns


class ClickHouseMetadataExtractor:
    """Extracts metadata from ClickHouse database."""
    
    def __init__(self):
        """Initialize the extractor with database connection."""
        load_dotenv()
        self.client = self._create_client()
        
        # Initialize LLM analyzer if API key is available
        try:
            self.llm_analyzer = GeminiLLMAnalyzer()
            model_name = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
            self.llm_enabled = True
            print(f"✅ LLM analysis enabled with Gemini model: {model_name}")
        except Exception as e:
            print(f"⚠️  LLM analysis disabled: {e}")
            self.llm_analyzer = None
            self.llm_enabled = False
        
    def _create_client(self) -> clickhouse_connect.driver.Client:
        """Create ClickHouse client connection."""
        try:
            # Debug: Print connection parameters
            print("CLICKHOUSE_HOST:", os.getenv('CLICKHOUSE_HOST', 'localhost'))
            print("CLICKHOUSE_PORT:", os.getenv('CLICKHOUSE_PORT', '8123'))
            print("CLICKHOUSE_USER:", os.getenv('CLICKHOUSE_USER', 'default'))
            print("CLICKHOUSE_PASSWORD:", os.getenv('CLICKHOUSE_PASSWORD', ''))
            print("CLICKHOUSE_DATABASE:", os.getenv('CLICKHOUSE_DATABASE', 'default'))
            
            client = clickhouse_connect.get_client(
                host=os.getenv('CLICKHOUSE_HOST'),
                port=int(os.getenv('CLICKHOUSE_PORT')),
                username=os.getenv('CLICKHOUSE_USER'),
                password=os.getenv('CLICKHOUSE_PASSWORD'),
                database=os.getenv('CLICKHOUSE_DATABASE')
            )
            return client
        except Exception as e:
            print(f"Error connecting to ClickHouse: {e}")
            sys.exit(1)
    
    def get_databases(self) -> List[str]:
        """Get list of databases based on filtering."""
        try:
            result = self.client.query("SHOW DATABASES")
            all_databases = [row[0] for row in result.result_rows]
            
            # Check if targeted schemas are specified
            targeted_schemas_str = os.getenv('TARGETED_SCHEMAS', '').strip()
            if targeted_schemas_str:
                targeted_schemas = [db.strip() for db in targeted_schemas_str.split(',')]
                # Filter databases
                filtered_databases = [db for db in all_databases if db in targeted_schemas]
                print(f"Filtering databases: {all_databases} -> {filtered_databases}")
                return filtered_databases
            else:
                return all_databases
        except Exception as e:
            print(f"Error getting databases: {e}")
            return []
    
    def get_schemas(self, database: str) -> List[str]:
        """Get list of schemas in a database."""
        try:
            # In ClickHouse, we'll use 'default' as the schema name
            # since ClickHouse doesn't have traditional schemas
            return ['default']
        except Exception as e:
            print(f"Error getting schemas for database {database}: {e}")
            return ['default']
    
    def get_tables(self, database: str) -> List[str]:
        """Get list of tables in a database based on filtering."""
        try:
            result = self.client.query(f"SHOW TABLES FROM {database}")
            all_tables = [row[0] for row in result.result_rows]
            
            # Check if target tables are specified
            target_tables_str = os.getenv('TARGET_TABLES', '').strip()
            if target_tables_str:
                target_tables = [table.strip() for table in target_tables_str.split(',')]
                # Filter tables
                filtered_tables = [table for table in all_tables if table in target_tables]
                print(f"  Filtering tables in {database}: {all_tables} -> {filtered_tables}")
                return filtered_tables
            else:
                return all_tables
        except Exception as e:
            print(f"Error getting tables for database {database}: {e}")
            return []
    
    def get_table_structure(self, database: str, table: str) -> List[Dict[str, Any]]:
        """Get table structure including column information."""
        try:
            result = self.client.query(f"DESCRIBE TABLE {database}.{table}")
            columns = []
            for row in result.result_rows:
                column_info = {
                    'name': row[0],
                    'type': row[1],
                    'default_type': row[2] if len(row) > 2 else None,
                    'default_expression': row[3] if len(row) > 3 else None,
                    'comment': row[4] if len(row) > 4 else None,
                    'codec_expression': row[5] if len(row) > 5 else None,
                    'ttl_expression': row[6] if len(row) > 6 else None
                }
                columns.append(column_info)
            return columns
        except Exception as e:
            print(f"Error getting table structure for {database}.{table}: {e}")
            return []
    
    def extract_metadata(self) -> Dict[str, Any]:
        """Extract all metadata from ClickHouse database."""
        print("Starting metadata extraction...")
        
        metadata = {
            'databases': {}
        }
        
        # Get all databases
        databases = self.get_databases()
        print(f"Found {len(databases)} databases: {databases}")
        
        for database in databases:
            print(f"\nProcessing database: {database}")
            metadata['databases'][database] = {
                'schemas': {}
            }
            
            # Get schemas for this database
            schemas = self.get_schemas(database)
            print(f"  Found {len(schemas)} schemas: {schemas}")
            
            for schema in schemas:
                metadata['databases'][database]['schemas'][schema] = {
                    'tables': {}
                }
                
                # Get tables for this database
                tables = self.get_tables(database)
                print(f"    Found {len(tables)} tables in schema {schema}")
                
                for table in tables:
                    print(f"      Processing table: {table}")
                    
                    # Get table structure
                    columns = self.get_table_structure(database, table)
                    
                    # Analyze columns with LLM if enabled
                    if self.llm_enabled and self.llm_analyzer:
                        try:
                            columns = self.llm_analyzer.analyze_table_structure(
                                table_name=table,
                                columns=columns,
                                database_name=database,
                                schema_name=schema
                            )
                        except Exception as e:
                            print(f"      Warning: LLM analysis failed for table {table}: {e}")
                            # Continue without LLM analysis if it fails
                    else:
                        print(f"      Skipping LLM analysis for table: {table}")
                    
                    metadata['databases'][database]['schemas'][schema]['tables'][table] = {
                        'columns': columns,
                        'column_count': len(columns)
                    }
        
        return metadata
    
    def save_metadata(self, metadata: Dict[str, Any], filename: str = 'clickhouse_metadata.json'):
        """Save metadata to JSON file."""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
            print(f"\nMetadata saved to {filename}")
        except Exception as e:
            print(f"Error saving metadata: {e}")
    
    def close(self):
        """Close the database connection."""
        if self.client:
            self.client.close()


def set_env_from_args(args):
    """Set environment variables from command line arguments."""
    if args.host:
        os.environ['CLICKHOUSE_HOST'] = args.host
    if args.port:
        os.environ['CLICKHOUSE_PORT'] = args.port
    if args.user:
        os.environ['CLICKHOUSE_USER'] = args.user
    if args.password:
        os.environ['CLICKHOUSE_PASSWORD'] = args.password
    if args.database:
        os.environ['CLICKHOUSE_DATABASE'] = args.database
    if args.secure is not None:
        os.environ['CLICKHOUSE_SECURE'] = str(args.secure).lower()
    if args.gemini_key:
        os.environ['GEMINI_API_KEY'] = args.gemini_key
    if args.gemini_model:
        os.environ['GEMINI_MODEL'] = args.gemini_model
    if args.targeted_schemas:
        os.environ['TARGETED_SCHEMAS'] = args.targeted_schemas
    if args.target_tables:
        os.environ['TARGET_TABLES'] = args.target_tables

def main():
    """Main function to run the metadata extraction."""
    print("ClickHouse Metadata Extractor")
    print("=" * 40)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='ClickHouse Metadata Extractor')
    parser.add_argument('--host', help='ClickHouse host')
    parser.add_argument('--port', help='ClickHouse port')
    parser.add_argument('--user', help='ClickHouse user')
    parser.add_argument('--password', help='ClickHouse password')
    parser.add_argument('--database', help='ClickHouse database')
    parser.add_argument('--secure', action='store_true', help='Use SSL/TLS')
    parser.add_argument('--gemini-key', help='Gemini API key')
    parser.add_argument('--gemini-model', help='Gemini model name')
    parser.add_argument('--targeted-schemas', help='Comma-separated list of targeted schemas')
    parser.add_argument('--target-tables', help='Comma-separated list of target tables')
    parser.add_argument('--config', help='Path to JSON configuration file')
    
    args = parser.parse_args()
    
    # Load config from JSON file if provided
    if args.config:
        try:
            with open(args.config, 'r') as f:
                config_data = json.load(f)
            
            # Set environment variables from config file
            if config_data.get('host'):
                os.environ['CLICKHOUSE_HOST'] = str(config_data['host'])
            if config_data.get('port'):
                os.environ['CLICKHOUSE_PORT'] = str(config_data['port'])
            if config_data.get('user'):
                os.environ['CLICKHOUSE_USER'] = str(config_data['user'])
            if config_data.get('password'):
                os.environ['CLICKHOUSE_PASSWORD'] = str(config_data['password'])
            if config_data.get('database'):
                os.environ['CLICKHOUSE_DATABASE'] = str(config_data['database'])
            if config_data.get('secure') is not None:
                os.environ['CLICKHOUSE_SECURE'] = str(config_data['secure']).lower()
            if config_data.get('geminiApiKey'):
                os.environ['GEMINI_API_KEY'] = str(config_data['geminiApiKey'])
            if config_data.get('geminiModel'):
                os.environ['GEMINI_MODEL'] = str(config_data['geminiModel'])
            if config_data.get('targetedSchemas'):
                os.environ['TARGETED_SCHEMAS'] = str(config_data['targetedSchemas'])
            if config_data.get('targetTables'):
                os.environ['TARGET_TABLES'] = str(config_data['targetTables'])
            
            print(f"✅ Configuration loaded from {args.config}")
        except Exception as e:
            print(f"❌ Error loading config file: {e}")
            sys.exit(1)
    else:
        # Set environment variables from command line arguments
        set_env_from_args(args)
    
    # Load environment variables (fallback to .env file if not provided via args)
    load_dotenv()
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("Warning: .env file not found. Please create one based on env.example")
        print("Using default connection parameters...")
    
    # Show filtering status
    targeted_schemas = os.getenv('TARGETED_SCHEMAS', '').strip()
    target_tables = os.getenv('TARGET_TABLES', '').strip()
    
    if targeted_schemas:
        print(f"📋 Database filtering enabled: {targeted_schemas}")
    else:
        print("📋 Extracting all databases")
    
    if target_tables:
        print(f"📋 Table filtering enabled: {target_tables}")
    else:
        print("📋 Extracting all tables")
    
    print()
    
    extractor = ClickHouseMetadataExtractor()
    
    try:
        # Extract metadata
        metadata = extractor.extract_metadata()
        
        # Save to JSON file
        extractor.save_metadata(metadata)
        
        # Print summary
        total_databases = len(metadata['databases'])
        total_tables = sum(
            len(db_info['schemas'][schema]['tables'])
            for db_info in metadata['databases'].values()
            for schema in db_info['schemas']
        )
        
        print(f"\nExtraction Summary:")
        print(f"  Total databases: {total_databases}")
        print(f"  Total tables: {total_tables}")
        print("Metadata extraction completed successfully!")
        
    except Exception as e:
        print(f"Error during metadata extraction: {e}")
        sys.exit(1)
    finally:
        extractor.close()


if __name__ == "__main__":
    main()
