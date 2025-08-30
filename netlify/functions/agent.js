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
          .from('data_source_connections')
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
          connectionId,
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
          const { organizationId, userId, connectionId, naturalLanguageQuery } = JSON.parse(event.body)
          await logQueryHistory({
            organizationId,
            userId,
            connectionId,
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
      .from('data_source_schemas')
      .select(`
        name,
        type,
        data_source_objects (
          name,
          type,
          data_source_fields (
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
      const objects = schema.data_source_objects.map(obj => {
        const fields = obj.data_source_fields.map(field => 
          `${field.name} (${field.data_type})${field.description ? ` - ${field.description}` : ''}`
        ).join(', ')
        return `${obj.type}: ${obj.name} - Fields: ${fields}`
      }).join('\n')
      return `${schema.type}: ${schema.name}\n${objects}`
    }).join('\n\n')

    // Use MindsDB MCP to convert natural language to SQL
    const mcpResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: `
        SELECT 
          'Convert the following natural language query to ${connection.type.toUpperCase()} SQL based on this schema context:' as instruction,
          '${naturalLanguageQuery.replace(/'/g, "''")}' as natural_language_query,
          '${schemaString.replace(/'/g, "''")}' as schema_context
      `,
      context: {
        datasource: {
          type: connection.type,
          ...connection.connection_config
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
          type: connection.type,
          ...connection.connection_config
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
  connectionId,
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
        data_source_connection_id: connectionId,
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
