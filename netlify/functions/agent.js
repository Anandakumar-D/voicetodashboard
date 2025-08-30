const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')
const cors = require('cors')({ origin: true })

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// MindsDB MCP configuration
const MINDSDB_HOST = process.env.MINDSDB_HOST || 'https://cloud.mindsdb.com'
const MINDSDB_API_KEY = process.env.MINDSDB_API_KEY

exports.handler = async (event, context) => {
  return new Promise((resolve, reject) => {
    cors(event, context, async () => {
      try {
        if (event.httpMethod !== 'POST') {
          return resolve({
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
          })
        }

        const { 
          naturalLanguageQuery, 
          connectionId, 
          organizationId,
          userId 
        } = JSON.parse(event.body)

        if (!naturalLanguageQuery || !connectionId) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: 'Natural language query and connection ID are required' })
          })
        }

        // Get connection details
        const { data: connection, error: connectionError } = await supabase
          .from('clickhouse_connections')
          .select('*')
          .eq('id', connectionId)
          .single()

        if (connectionError || !connection) {
          return resolve({
            statusCode: 404,
            body: JSON.stringify({ error: 'Connection not found' })
          })
        }

        // Get schema context for the query
        const schemaContext = await getSchemaContext(connectionId)

        // Convert natural language to SQL using MindsDB MCP
        const sqlQuery = await convertToSQL(naturalLanguageQuery, schemaContext, connection)

        // Execute the query
        const queryResult = await executeQuery(sqlQuery, connection)

        // Log query history
        await logQueryHistory({
          organizationId,
          userId,
          naturalLanguageQuery,
          sqlQuery,
          rowCount: queryResult.length,
          status: 'success'
        })

        return resolve({
          statusCode: 200,
          body: JSON.stringify({
            sql: sqlQuery,
            result: queryResult,
            rowCount: queryResult.length
          })
        })

      } catch (error) {
        console.error('Error in agent function:', error)
        
        // Log failed query
        if (event.body) {
          const { organizationId, userId, naturalLanguageQuery } = JSON.parse(event.body)
          await logQueryHistory({
            organizationId,
            userId,
            naturalLanguageQuery,
            sqlQuery: '',
            rowCount: 0,
            status: 'error',
            errorMessage: error.message
          })
        }

        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        })
      }
    })
  })
}

async function getSchemaContext(connectionId) {
  try {
    const { data: schemas } = await supabase
      .from('database_schemas')
      .select(`
        name,
        tables (
          name,
          columns (
            name,
            data_type,
            description,
            ai_description
          )
        )
      `)
      .eq('connection_id', connectionId)

    return schemas || []
  } catch (error) {
    console.error('Error getting schema context:', error)
    return []
  }
}

async function convertToSQL(naturalLanguageQuery, schemaContext, connection) {
  try {
    // Build schema context string
    const schemaString = schemaContext.map(schema => {
      const tables = schema.tables.map(table => {
        const columns = table.columns.map(col => 
          `${col.name} (${col.data_type})${col.description ? ` - ${col.description}` : ''}`
        ).join(', ')
        return `Table: ${table.name} - Columns: ${columns}`
      }).join('\n')
      return `Database: ${schema.name}\n${tables}`
    }).join('\n\n')

    // Use MindsDB MCP to convert natural language to SQL
    const mcpResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: `
        SELECT 
          'Convert the following natural language query to ClickHouse SQL based on this schema context:' as instruction,
          '${naturalLanguageQuery.replace(/'/g, "''")}' as natural_language_query,
          '${schemaString.replace(/'/g, "''")}' as schema_context
      `,
      context: {
        datasource: {
          type: 'clickhouse',
          host: connection.host,
          port: connection.port,
          database: connection.database,
          username: connection.username,
          password: connection.password,
          secure: connection.secure
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${MINDSDB_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    // Extract SQL from the response
    const sqlQuery = mcpResponse.data[0]?.sql_query || ''
    
    if (!sqlQuery) {
      throw new Error('Failed to generate SQL query')
    }

    return sqlQuery
  } catch (error) {
    console.error('Error converting to SQL:', error)
    throw new Error('Failed to convert natural language to SQL')
  }
}

async function executeQuery(sqlQuery, connection) {
  try {
    const mcpResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: sqlQuery,
      context: {
        datasource: {
          type: 'clickhouse',
          host: connection.host,
          port: connection.port,
          database: connection.database,
          username: connection.username,
          password: connection.password,
          secure: connection.secure
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${MINDSDB_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    return mcpResponse.data || []
  } catch (error) {
    console.error('Error executing query:', error)
    throw new Error('Failed to execute SQL query')
  }
}

async function logQueryHistory({ 
  organizationId, 
  userId, 
  naturalLanguageQuery, 
  sqlQuery, 
  rowCount, 
  status, 
  errorMessage 
}) {
  try {
    await supabase
      .from('query_history')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        natural_language_query: naturalLanguageQuery,
        sql_query: sqlQuery,
        row_count: rowCount,
        status: status,
        error_message: errorMessage
      })
  } catch (error) {
    console.error('Error logging query history:', error)
  }
}
