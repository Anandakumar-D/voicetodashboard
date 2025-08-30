const { Server } = require('@modelcontextprotocol/sdk/server/index.js')
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js')
const axios = require('axios')
require('dotenv').config()

// MindsDB configuration - supports both local and cloud
const MINDSDB_HOST = process.env.MINDSDB_HOST || 'http://localhost:47334'
const MINDSDB_API_KEY = process.env.MINDSDB_API_KEY || '' // Optional for local
const MINDSDB_USERNAME = process.env.MINDSDB_USERNAME || 'mindsdb'
const MINDSDB_PASSWORD = process.env.MINDSDB_PASSWORD || 'mindsdb'

class MindsDBMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'auralytics-mindsdb-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    )

    this.setupToolHandlers()
  }

  setupToolHandlers() {
    // Tool: Convert natural language to SQL
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params

      switch (name) {
        case 'convert_natural_language_to_sql':
          return await this.convertNaturalLanguageToSQL(args)
        
        case 'execute_sql_query':
          return await this.executeSQLQuery(args)
        
        case 'get_schema_info':
          return await this.getSchemaInfo(args)
        
        case 'test_connection':
          return await this.testConnection(args)
        
        case 'create_datasource':
          return await this.createDataSource(args)
        
        case 'list_datasources':
          return await this.listDataSources(args)
        
        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    })
  }

  // Helper method to get authentication headers
  getAuthHeaders() {
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

  async convertNaturalLanguageToSQL(args) {
    try {
      const { naturalLanguageQuery, schemaContext, dataSourceType, connectionConfig } = args

      if (!naturalLanguageQuery) {
        throw new Error('Natural language query is required')
      }

      // For local MindsDB, we'll use a different approach
      // We'll create a simple prompt and use MindsDB's SQL generation capabilities
      const prompt = `
        Convert the following natural language query to ${dataSourceType?.toUpperCase() || 'SQL'}:
        
        Query: "${naturalLanguageQuery}"
        
        ${schemaContext ? `Schema Context:\n${schemaContext}` : ''}
        
        Please provide only the SQL query without any explanations.
      `

      // Use MindsDB's SQL API
      const response = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
        query: prompt
      }, {
        headers: this.getAuthHeaders()
      })

      const sqlQuery = response.data[0]?.sql_query || response.data[0]?.query || ''

      return {
        content: [
          {
            type: 'text',
            text: sqlQuery
          }
        ]
      }

    } catch (error) {
      console.error('Error converting natural language to SQL:', error)
      throw new Error(`Failed to convert natural language to SQL: ${error.message}`)
    }
  }

  async executeSQLQuery(args) {
    try {
      const { sqlQuery, dataSourceType, connectionConfig } = args

      if (!sqlQuery) {
        throw new Error('SQL query is required')
      }

      // Execute query via MindsDB
      const response = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
        query: sqlQuery
      }, {
        headers: this.getAuthHeaders()
      })

      const results = response.data || []

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }
        ]
      }

    } catch (error) {
      console.error('Error executing SQL query:', error)
      throw new Error(`Failed to execute SQL query: ${error.message}`)
    }
  }

  async getSchemaInfo(args) {
    try {
      const { dataSourceType, connectionConfig } = args

      // Get schema information via MindsDB
      const response = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
        query: 'SHOW TABLES'
      }, {
        headers: this.getAuthHeaders()
      })

      const schemaInfo = response.data || []

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(schemaInfo, null, 2)
          }
        ]
      }

    } catch (error) {
      console.error('Error getting schema info:', error)
      throw new Error(`Failed to get schema info: ${error.message}`)
    }
  }

  async testConnection(args) {
    try {
      const { dataSourceType, connectionConfig } = args

      // Test connection via MindsDB
      const response = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
        query: 'SELECT 1 as test'
      }, {
        headers: this.getAuthHeaders()
      })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'success', 
              message: 'Connection test successful',
              data: response.data 
            })
          }
        ]
      }

    } catch (error) {
      console.error('Error testing connection:', error)
      throw new Error(`Connection test failed: ${error.message}`)
    }
  }

  async createDataSource(args) {
    try {
      const { name, type, connectionConfig } = args

      if (!name || !type || !connectionConfig) {
        throw new Error('Name, type, and connection config are required')
      }

      // Create data source in MindsDB
      const createQuery = `
        CREATE DATASOURCE ${name}
        WITH ENGINE = '${type}',
        PARAMETERS = ${JSON.stringify(connectionConfig)}
      `

      const response = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
        query: createQuery
      }, {
        headers: this.getAuthHeaders()
      })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'success', 
              message: `Data source ${name} created successfully`,
              data: response.data 
            })
          }
        ]
      }

    } catch (error) {
      console.error('Error creating data source:', error)
      throw new Error(`Failed to create data source: ${error.message}`)
    }
  }

  async listDataSources(args) {
    try {
      // List all data sources in MindsDB
      const response = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
        query: 'SHOW DATASOURCES'
      }, {
        headers: this.getAuthHeaders()
      })

      const dataSources = response.data || []

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(dataSources, null, 2)
          }
        ]
      }

    } catch (error) {
      console.error('Error listing data sources:', error)
      throw new Error(`Failed to list data sources: ${error.message}`)
    }
  }

  async run() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.log('MindsDB MCP Server started')
    console.log(`Connecting to MindsDB at: ${MINDSDB_HOST}`)
  }
}

// Start the server
const server = new MindsDBMCPServer()
server.run().catch(console.error)
