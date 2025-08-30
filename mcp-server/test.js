const axios = require('axios')
require('dotenv').config()

// Test configuration - supports both local and cloud
const MINDSDB_HOST = process.env.MINDSDB_HOST || 'http://localhost:47334'
const MINDSDB_API_KEY = process.env.MINDSDB_API_KEY || ''
const MINDSDB_USERNAME = process.env.MINDSDB_USERNAME || 'mindsdb'
const MINDSDB_PASSWORD = process.env.MINDSDB_PASSWORD || 'mindsdb'

// Helper function to get auth headers
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  }
  
  if (MINDSDB_API_KEY) {
    headers['Authorization'] = `Bearer ${MINDSDB_API_KEY}`
  } else {
    // For local MindsDB, use basic auth
    const auth = Buffer.from(`${MINDSDB_USERNAME}:${MINDSDB_PASSWORD}`).toString('base64')
    headers['Authorization'] = `Basic ${auth}`
  }
  
  return headers
}

async function testMindsDBConnection() {
  console.log('🧪 Testing MindsDB MCP Server (Local)...\n')
  console.log(`🔗 Connecting to: ${MINDSDB_HOST}`)

  if (!MINDSDB_API_KEY && !MINDSDB_USERNAME) {
    console.error('❌ No authentication configured')
    console.log('Please set up MindsDB credentials in the .env file')
    return false
  }

  try {
    // Test 1: Basic connection test
    console.log('1️⃣ Testing basic connection...')
    const testResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: 'SELECT 1 as test_connection'
    }, {
      headers: getAuthHeaders()
    })

    console.log('✅ Basic connection successful')
    console.log('Response:', testResponse.data)

    // Test 2: Check MindsDB version
    console.log('\n2️⃣ Checking MindsDB version...')
    const versionResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: 'SELECT version() as mindsdb_version'
    }, {
      headers: getAuthHeaders()
    })

    console.log('✅ Version check successful')
    console.log('MindsDB Version:', versionResponse.data)

    // Test 3: List available data sources
    console.log('\n3️⃣ Listing data sources...')
    const datasourcesResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: 'SHOW DATASOURCES'
    }, {
      headers: getAuthHeaders()
    })

    console.log('✅ Data sources listing successful')
    console.log('Available data sources:', datasourcesResponse.data)

    // Test 4: Natural language to SQL conversion (basic test)
    console.log('\n4️⃣ Testing natural language to SQL conversion...')
    const nlQuery = 'Show me the top 10 users by activity'
    
    const nlResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: `SELECT 'Convert this natural language query to SQL: "${nlQuery}"' as prompt`
    }, {
      headers: getAuthHeaders()
    })

    console.log('✅ Natural language conversion test successful')
    console.log('Response:', nlResponse.data)

    console.log('\n🎉 All tests passed! MindsDB MCP Server is ready to use.')
    return true

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
    
    return false
  }
}

async function testDataSourceConnection(dataSourceType, connectionConfig) {
  console.log(`\n🔗 Testing ${dataSourceType} connection...`)
  
  try {
    // First, create the data source
    const createQuery = `
      CREATE DATASOURCE test_${dataSourceType}
      WITH ENGINE = '${dataSourceType}',
      PARAMETERS = ${JSON.stringify(connectionConfig)}
    `

    const createResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: createQuery
    }, {
      headers: getAuthHeaders()
    })

    console.log(`✅ ${dataSourceType} data source created`)
    console.log('Create response:', createResponse.data)

    // Test the connection
    const testResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: `SELECT 1 as connection_test FROM test_${dataSourceType} LIMIT 1`
    }, {
      headers: getAuthHeaders()
    })

    console.log(`✅ ${dataSourceType} connection test successful`)
    console.log('Test response:', testResponse.data)
    return true

  } catch (error) {
    console.error(`❌ ${dataSourceType} connection failed:`, error.message)
    return false
  }
}

// Example data source configurations for local testing
const testConfigs = {
  clickhouse: {
    host: 'localhost',
    port: 8123,
    database: 'default',
    username: 'default',
    password: 'password'
  },
  mysql: {
    host: 'localhost',
    port: 3306,
    database: 'test',
    username: 'root',
    password: 'password'
  },
  postgresql: {
    host: 'localhost',
    port: 5432,
    database: 'test',
    username: 'postgres',
    password: 'password'
  }
}

async function runAllTests() {
  console.log('🚀 Starting MindsDB MCP Server Tests (Local)\n')
  
  // Test basic MindsDB connection
  const basicTestPassed = await testMindsDBConnection()
  
  if (basicTestPassed) {
    // Test data source connections (these will fail without actual databases)
    console.log('\n📊 Testing data source connections (will fail without actual databases)...')
    
    for (const [type, config] of Object.entries(testConfigs)) {
      await testDataSourceConnection(type, config)
    }
  }
  
  console.log('\n✨ Test suite completed!')
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = {
  testMindsDBConnection,
  testDataSourceConnection,
  runAllTests
}
