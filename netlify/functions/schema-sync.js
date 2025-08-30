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
  // Handle CORS
  return new Promise((resolve, reject) => {
    cors(event, context, async () => {
      try {
        // Only allow POST requests
        if (event.httpMethod !== 'POST') {
          return resolve({
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
          })
        }

        const { connectionId } = JSON.parse(event.body)

        if (!connectionId) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: 'Connection ID is required' })
          })
        }

        // Get connection details from Supabase
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

        // Sync schema using MindsDB MCP
        const schemaData = await syncSchemaViaMCP(connection)

        // Store schema data in Supabase
        await storeSchemaData(connectionId, schemaData)

        return resolve({
          statusCode: 200,
          body: JSON.stringify({
            message: 'Schema synced successfully',
            data: schemaData
          })
        })

      } catch (error) {
        console.error('Error in schema-sync:', error)
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        })
      }
    })
  })
}

async function syncSchemaViaMCP(connection) {
  try {
    // Connect to ClickHouse via MindsDB MCP
    const mcpResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: `
        SELECT 
          database,
          table,
          name as column_name,
          type as data_type,
          default_expression as default_value
        FROM system.columns 
        WHERE database = '${connection.database}'
        ORDER BY database, table, position
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

    return mcpResponse.data
  } catch (error) {
    console.error('MCP sync error:', error)
    throw new Error('Failed to sync schema via MCP')
  }
}

async function storeSchemaData(connectionId, schemaData) {
  try {
    // Group data by database and table
    const schemas = {}
    const tables = {}
    const columns = []

    schemaData.forEach(row => {
      const { database, table, column_name, data_type, default_value } = row

      // Create schema entry
      if (!schemas[database]) {
        schemas[database] = {
          connection_id: connectionId,
          name: database,
          description: `Database: ${database}`
        }
      }

      // Create table entry
      const tableKey = `${database}.${table}`
      if (!tables[tableKey]) {
        tables[tableKey] = {
          schema_name: database,
          name: table,
          description: `Table: ${table}`
        }
      }

      // Create column entry
      columns.push({
        table_name: table,
        schema_name: database,
        name: column_name,
        data_type: data_type,
        default_value: default_value || null
      })
    })

    // Store schemas
    for (const schema of Object.values(schemas)) {
      await supabase
        .from('database_schemas')
        .upsert(schema, { onConflict: 'connection_id,name' })
    }

    // Store tables
    for (const table of Object.values(tables)) {
      const { data: schema } = await supabase
        .from('database_schemas')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('name', table.schema_name)
        .single()

      if (schema) {
        await supabase
          .from('tables')
          .upsert({
            schema_id: schema.id,
            name: table.name,
            description: table.description
          }, { onConflict: 'schema_id,name' })
      }
    }

    // Store columns
    for (const column of columns) {
      const { data: table } = await supabase
        .from('tables')
        .select('id')
        .eq('name', column.table_name)
        .single()

      if (table) {
        await supabase
          .from('columns')
          .upsert({
            table_id: table.id,
            name: column.name,
            data_type: column.data_type,
            default_value: column.default_value
          }, { onConflict: 'table_id,name' })
      }
    }

  } catch (error) {
    console.error('Error storing schema data:', error)
    throw new Error('Failed to store schema data')
  }
}
