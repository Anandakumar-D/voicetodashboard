# MindsDB MCP Server for Auralytics

This is a Model Context Protocol (MCP) server that integrates MindsDB with Auralytics for natural language to SQL conversion and data source management.

## Features

- **Natural Language to SQL Conversion**: Convert user queries to SQL using MindsDB AI
- **SQL Query Execution**: Execute SQL queries against various data sources
- **Schema Information Retrieval**: Get database schema information
- **Connection Testing**: Test data source connections
- **Multi-DataSource Support**: Support for ClickHouse, MySQL, PostgreSQL, MongoDB, etc.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Required variables:
- `MINDSDB_API_KEY`: Your MindsDB Cloud API key
- `MINDSDB_HOST`: MindsDB Cloud host (default: https://cloud.mindsdb.com)

### 3. Get MindsDB API Key

1. Go to [MindsDB Cloud](https://cloud.mindsdb.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

### 4. Run the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Tools

### 1. convert_natural_language_to_sql

Converts natural language queries to SQL.

**Parameters:**
- `naturalLanguageQuery` (string): The natural language query
- `schemaContext` (string, optional): Database schema context
- `dataSourceType` (string, optional): Type of data source (clickhouse, mysql, etc.)
- `connectionConfig` (object, optional): Connection configuration

### 2. execute_sql_query

Executes SQL queries against data sources.

**Parameters:**
- `sqlQuery` (string): The SQL query to execute
- `dataSourceType` (string): Type of data source
- `connectionConfig` (object): Connection configuration

### 3. get_schema_info

Retrieves schema information from data sources.

**Parameters:**
- `dataSourceType` (string): Type of data source
- `connectionConfig` (object): Connection configuration

### 4. test_connection

Tests data source connections.

**Parameters:**
- `dataSourceType` (string): Type of data source
- `connectionConfig` (object): Connection configuration

## Supported Data Sources

- **ClickHouse**: High-performance columnar database
- **MySQL**: Popular open-source relational database
- **PostgreSQL**: Advanced open-source database
- **MongoDB**: Document-based NoSQL database
- **Snowflake**: Cloud data platform
- **BigQuery**: Google Cloud data warehouse

## Integration with Auralytics

This MCP server is used by the Auralytics frontend to:

1. Convert natural language queries from the Chat Interface to SQL
2. Execute queries against connected data sources
3. Sync schema information for data source connections
4. Test data source connectivity

## Error Handling

The server includes comprehensive error handling for:
- Invalid API keys
- Network connectivity issues
- Data source connection failures
- Query execution errors
- Schema retrieval failures

## Logging

The server logs all operations for debugging and monitoring:
- Tool calls and responses
- Error messages and stack traces
- Connection attempts and results
- Query execution statistics
