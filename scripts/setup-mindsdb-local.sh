#!/bin/bash

echo "🚀 Setting up MindsDB locally for Auralytics..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Create mindsdb_config directory if it doesn't exist
if [ ! -d "mindsdb_config" ]; then
    mkdir -p mindsdb_config
    echo "✅ Created mindsdb_config directory"
fi

# Start MindsDB
echo "🐳 Starting MindsDB container..."
docker-compose up -d mindsdb

# Wait for MindsDB to be ready
echo "⏳ Waiting for MindsDB to start..."
sleep 10

# Test connection
echo "🧪 Testing MindsDB connection..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s -f http://localhost:47334/api/sql/query > /dev/null 2>&1; then
        echo "✅ MindsDB is ready!"
        break
    else
        echo "⏳ Attempt $attempt/$max_attempts - Waiting for MindsDB..."
        sleep 2
        attempt=$((attempt + 1))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ MindsDB failed to start within the expected time"
    echo "Check the logs with: docker-compose logs mindsdb"
    exit 1
fi

# Test basic query
echo "🧪 Testing basic query..."
curl -X POST http://localhost:47334/api/sql/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'mindsdb:mindsdb' | base64)" \
  -d '{"query": "SELECT 1 as test"}' \
  | jq '.' 2>/dev/null || echo "Query test completed"

echo ""
echo "🎉 MindsDB setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test the MCP server: cd mcp-server && node test.js"
echo "2. Start the MCP server: cd mcp-server && npm start"
echo "3. Access MindsDB UI: http://localhost:47334"
echo ""
echo "🔧 Useful commands:"
echo "- View logs: docker-compose logs mindsdb"
echo "- Stop MindsDB: docker-compose down"
echo "- Restart MindsDB: docker-compose restart mindsdb"
echo ""
echo "📚 Documentation:"
echo "- MindsDB docs: https://docs.mindsdb.com/"
echo "- MCP server: mcp-server/README.md"
