const express = require('express')
const cors = require('cors')
const axios = require('axios')
require('dotenv').config({ path: './env.local' })

const app = express()
const PORT = 8888

// Middleware
app.use(cors())
app.use(express.json())

// MindsDB configuration
const MINDSDB_HOST = process.env.MINDSDB_HOST || 'http://localhost:47334'
const MINDSDB_USERNAME = process.env.MINDSDB_USERNAME || 'mindsdb'
const MINDSDB_PASSWORD = process.env.MINDSDB_PASSWORD || 'mindsdb'

// Helper function to get auth headers for local MindsDB
function getAuthHeaders() {
  const auth = Buffer.from(`${MINDSDB_USERNAME}:${MINDSDB_PASSWORD}`).toString('base64')
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  }
}

// Test endpoint
app.get('/.netlify/functions/agent', (req, res) => {
  res.json({ message: 'Agent function is running' })
})

// Agent function endpoint
app.post('/.netlify/functions/agent', async (req, res) => {
  try {
    const { naturalLanguageQuery, connectionId } = req.body
    
    console.log('Agent function called with:', { naturalLanguageQuery, connectionId })
    
    // For now, return a mock response
    res.json({
      sql: `SELECT * FROM users WHERE activity_score > 0 ORDER BY activity_score DESC LIMIT 10`,
      result: [
        { id: 1, name: 'John Doe', activity_score: 95 },
        { id: 2, name: 'Jane Smith', activity_score: 87 },
        { id: 3, name: 'Bob Johnson', activity_score: 82 }
      ],
      rowCount: 3
    })
  } catch (error) {
    console.error('Agent function error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Schema sync function endpoint
app.post('/.netlify/functions/schema-sync', async (req, res) => {
  try {
    const { connectionId, connection } = req.body
    
    console.log('Schema sync function called with:', { connectionId, connection })
    
    // Test the connection via MindsDB
    const testResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: 'SELECT 1 as test_connection'
    }, { headers: getAuthHeaders() })
    
    console.log('MindsDB test response:', testResponse.data)
    
    // Return success response
    res.json({
      success: true,
      message: 'Connection tested successfully',
      mindsdb_response: testResponse.data
    })
  } catch (error) {
    console.error('Schema sync function error:', error)
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to test connection via MindsDB'
    })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mindsdb_host: MINDSDB_HOST,
    timestamp: new Date().toISOString()
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Development server running on http://localhost:${PORT}`)
  console.log(`📊 MindsDB host: ${MINDSDB_HOST}`)
  console.log(`🔗 Agent function: http://localhost:${PORT}/.netlify/functions/agent`)
  console.log(`🔗 Schema sync function: http://localhost:${PORT}/.netlify/functions/schema-sync`)
  console.log(`🏥 Health check: http://localhost:${PORT}/health`)
})
