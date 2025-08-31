const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')
const cors = require('cors')({ origin: true })

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// MindsDB MCP configuration - supports both local and cloud
const MINDSDB_HOST = process.env.MINDSDB_HOST || 'http://localhost:47334'
const MINDSDB_API_KEY = process.env.MINDSDB_API_KEY || '' // Optional for local
const MINDSDB_USERNAME = process.env.MINDSDB_USERNAME || 'mindsdb'
const MINDSDB_PASSWORD = process.env.MINDSDB_PASSWORD || 'mindsdb'

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

        // Sync schema using MindsDB MCP based on connection type
        const schemaData = await syncSchemaViaMCP(connection)

        // Store schema data in Supabase
        await storeSchemaData(connectionId, schemaData, connection.type)

        // Log sync history
        await logSyncHistory(connectionId, 'schema', 'success', schemaData.length, 0)

        return resolve({
          statusCode: 200,
          body: JSON.stringify({
            message: 'Schema synced successfully',
            data: schemaData
          })
        })

      } catch (error) {
        console.error('Error in schema-sync:', error)
        
        // Log failed sync
        if (event.body) {
          const { connectionId } = JSON.parse(event.body)
          await logSyncHistory(connectionId, 'schema', 'failed', 0, 0, error.message)
        }

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
    const { type, connection_config } = connection
    
    // Build query based on data source type
    let query
    switch (type) {
      case 'clickhouse':
        query = `
          SELECT 
            database,
            table,
            name as column_name,
            type as data_type,
            default_expression as default_value
          FROM system.columns 
          WHERE database = '${connection_config.database}'
          ORDER BY database, table, position
        `
        break
      
      case 'mysql':
        query = `
          SELECT 
            TABLE_SCHEMA as database,
            TABLE_NAME as table,
            COLUMN_NAME as column_name,
            DATA_TYPE as data_type,
            COLUMN_DEFAULT as default_value
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = '${connection_config.database}'
          ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
        `
        break
      
      case 'postgresql':
        query = `
          SELECT 
            table_schema as database,
            table_name as table,
            column_name,
            data_type,
            column_default as default_value
          FROM information_schema.columns 
          WHERE table_schema = '${connection_config.database || 'public'}'
          ORDER BY table_schema, table_name, ordinal_position
        `
        break
      
      default:
        throw new Error(`Unsupported data source type: ${type}`)
    }

    // Connect to data source via MindsDB MCP
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
    
    const mcpResponse = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
      query: query,
      context: {
        datasource: {
          type: type,
          ...connection_config
        }
      }
    }, { headers })

    return mcpResponse.data
  } catch (error) {
    console.error('MCP sync error:', error)
    throw new Error(`Failed to sync schema via MCP for ${connection.type}`)
  }
}

async function storeSchemaData(connectionId, schemaData, dataSourceType) {
  try {
    // Group data by database/schema and table/object
    const schemas = {}
    const objects = {}
    const fields = []

    schemaData.forEach(row => {
      const { database, table, column_name, data_type, default_value } = row

      // Create schema entry
      if (!schemas[database]) {
        schemas[database] = {
          connection_id: connectionId,
          name: database,
          type: getSchemaType(dataSourceType),
          description: `${dataSourceType.toUpperCase()} Database: ${database}`,
          metadata: { data_source_type: dataSourceType }
        }
      }

      // Create object entry
      const objectKey = `${database}.${table}`
      if (!objects[objectKey]) {
        objects[objectKey] = {
          schema_name: database,
          name: table,
          type: getObjectType(dataSourceType),
          description: `${dataSourceType.toUpperCase()} Object: ${table}`,
          metadata: { data_source_type: dataSourceType }
        }
      }

      // Create field entry
      fields.push({
        object_name: table,
        schema_name: database,
        name: column_name,
        data_type: data_type,
        default_value: default_value || null,
        metadata: { data_source_type: dataSourceType }
      })
    })

    // Store schemas
    for (const schema of Object.values(schemas)) {
      await supabase
        .from('data_source_schemas')
        .upsert(schema, { onConflict: 'connection_id,name' })
    }

    // Store objects
    for (const object of Object.values(objects)) {
      const { data: schema } = await supabase
        .from('data_source_schemas')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('name', object.schema_name)
        .single()

      if (schema) {
        await supabase
          .from('data_source_objects')
          .upsert({
            schema_id: schema.id,
            name: object.name,
            type: object.type,
            description: object.description,
            metadata: object.metadata
          }, { onConflict: 'schema_id,name' })
      }
    }

    // Store fields
    for (const field of fields) {
      const { data: object } = await supabase
        .from('data_source_objects')
        .select('id')
        .eq('name', field.object_name)
        .single()

      if (object) {
        await supabase
          .from('data_source_fields')
          .upsert({
            object_id: object.id,
            name: field.name,
            data_type: field.data_type,
            default_value: field.default_value,
            metadata: field.metadata
          }, { onConflict: 'object_id,name' })
      }
    }

  } catch (error) {
    console.error('Error storing schema data:', error)
    throw new Error('Failed to store schema data')
  }
}

function getSchemaType(dataSourceType) {
  switch (dataSourceType) {
    case 'clickhouse':
    case 'mysql':
    case 'postgresql':
      return 'database'
    case 'mongodb':
      return 'database'
    case 'api':
      return 'api_endpoint'
    default:
      return 'unknown'
  }
}

function getObjectType(dataSourceType) {
  switch (dataSourceType) {
    case 'clickhouse':
    case 'mysql':
    case 'postgresql':
      return 'table'
    case 'mongodb':
      return 'collection'
    case 'api':
      return 'endpoint'
    default:
      return 'object'
  }
}

async function logSyncHistory(connectionId, syncType, status, objectsSynced, fieldsSynced, errorMessage = null) {
  try {
    await supabase
      .from('data_source_sync_history')
      .insert({
        connection_id: connectionId,
        sync_type: syncType,
        status: status,
        objects_synced: objectsSynced,
        fields_synced: fieldsSynced,
        error_message: errorMessage,
        completed_at: status === 'success' ? new Date().toISOString() : null
      })
  } catch (error) {
    console.error('Error logging sync history:', error)
  }
}
