const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')
const cors = require('cors')({ origin: true })

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// MindsDB configuration - supports both local and cloud
const MINDSDB_HOST = process.env.MINDSDB_HOST || 'http://localhost:47334'
const MINDSDB_API_KEY = process.env.MINDSDB_API_KEY || '' // Optional for local
const MINDSDB_USERNAME = process.env.MINDSDB_USERNAME || 'mindsdb'
const MINDSDB_PASSWORD = process.env.MINDSDB_PASSWORD || 'mindsdb'

// AI Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

class GeminiLLMAnalyzer {
  constructor() {
    if (!GEMINI_API_KEY) {
      console.log('⚠️  Gemini API key not found, AI analysis will be disabled')
      this.enabled = false
      return
    }
    this.enabled = true
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models'
  }

  async generateColumnDefinition(tableName, columnName, columnType, databaseName = null, schemaName = null) {
    if (!this.enabled) {
      return `Column ${columnName} of type ${columnType}`
    }

    const prompt = `
Analyze this database column and provide a clear, concise definition of what this column likely represents.

Database: ${databaseName}
Schema: ${schemaName}
Table: ${tableName}
Column Name: ${columnName}
Column Type: ${columnType}

Provide a brief, professional definition (1 to 2 sentences) focusing on business meaning rather than technical details.

Definition:
`.trim()

    try {
      const response = await axios.post(
        `${this.baseUrl}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
      return text ? text.trim() : `Column ${columnName} of type ${columnType}`
    } catch (error) {
      console.error(`Error generating definition for ${tableName}.${columnName}:`, error.message)
      return `Column ${columnName} of type ${columnType}`
    }
  }

  async analyzeTableStructure(tableName, columns, databaseName = null, schemaName = null) {
    console.log(`      Analyzing table structure for: ${tableName}`)
    
    for (const column of columns) {
      if (!column.comment || column.comment.trim() === '') {
        console.log(`        Generating definition for column: ${column.name}`)
        const definition = await this.generateColumnDefinition(
          tableName,
          column.name,
          column.type,
          databaseName,
          schemaName
        )
        column.ai_definition = definition
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } else {
        column.ai_definition = column.comment
      }
    }
    
    return columns
  }
}

class EnhancedMetadataExtractor {
  constructor() {
    this.llmAnalyzer = new GeminiLLMAnalyzer()
  }

  // Helper function to get auth headers for local MindsDB
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

  async getDatabases(connection) {
    try {
      const query = 'SHOW DATABASES'
      const response = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
        query: query,
        context: {
          datasource: {
            type: connection.type,
            ...connection.connection_config
          }
        }
      }, { headers: this.getAuthHeaders() })

      if (response.data.type === 'table') {
        return response.data.data.map(row => row[0])
      }
      return []
    } catch (error) {
      console.error('Error getting databases:', error)
      return ['default'] // Fallback
    }
  }

  async getTables(connection, database) {
    try {
      const query = `SHOW TABLES FROM ${database}`
      const response = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
        query: query,
        context: {
          datasource: {
            type: connection.type,
            ...connection.connection_config
          }
        }
      }, { headers: this.getAuthHeaders() })

      if (response.data.type === 'table') {
        return response.data.data.map(row => row[0])
      }
      return []
    } catch (error) {
      console.error(`Error getting tables for database ${database}:`, error)
      return []
    }
  }

  async getTableStructure(connection, database, table) {
    try {
      let query
      switch (connection.type) {
        case 'clickhouse':
          query = `DESCRIBE TABLE ${database}.${table}`
          break
        case 'mysql':
          query = `
            SELECT 
              COLUMN_NAME as name,
              DATA_TYPE as type,
              IS_NULLABLE as is_nullable,
              COLUMN_DEFAULT as default_expression,
              COLUMN_COMMENT as comment
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${database}' AND TABLE_NAME = '${table}'
            ORDER BY ORDINAL_POSITION
          `
          break
        case 'postgresql':
          query = `
            SELECT 
              column_name as name,
              data_type as type,
              is_nullable,
              column_default as default_expression,
              col_description((table_schema||'.'||table_name)::regclass, ordinal_position) as comment
            FROM information_schema.columns 
            WHERE table_schema = '${database}' AND table_name = '${table}'
            ORDER BY ordinal_position
          `
          break
        default:
          throw new Error(`Unsupported data source type: ${connection.type}`)
      }

      const response = await axios.post(`${MINDSDB_HOST}/api/sql/query`, {
        query: query,
        context: {
          datasource: {
            type: connection.type,
            ...connection.connection_config
          }
        }
      }, { headers: this.getAuthHeaders() })

      if (response.data.type === 'table') {
        const columns = []
        for (const row of response.data.data) {
          if (connection.type === 'clickhouse') {
            columns.push({
              name: row[0],
              type: row[1],
              default_type: row[2] || null,
              default_expression: row[3] || null,
              comment: row[4] || null,
              codec_expression: row[5] || null,
              ttl_expression: row[6] || null
            })
          } else {
            // For MySQL/PostgreSQL, map the results
            columns.push({
              name: row[0],
              type: row[1],
              is_nullable: row[2] === 'YES' || row[2] === true,
              default_expression: row[3] || null,
              comment: row[4] || null
            })
          }
        }
        return columns
      }
      return []
    } catch (error) {
      console.error(`Error getting table structure for ${database}.${table}:`, error)
      return []
    }
  }

  async extractComprehensiveMetadata(connection) {
    console.log('Starting comprehensive metadata extraction...')
    
    const metadata = {
      databases: {}
    }
    
    // Get all databases
    const databases = await this.getDatabases(connection)
    console.log(`Found ${databases.length} databases: ${databases}`)
    
    for (const database of databases) {
      console.log(`\nProcessing database: ${database}`)
      metadata.databases[database] = {
        schemas: {}
      }
      
      // For ClickHouse, use 'default' schema
      const schemas = ['default']
      console.log(`  Found ${schemas.length} schemas: ${schemas}`)
      
      for (const schema of schemas) {
        metadata.databases[database].schemas[schema] = {
          tables: {}
        }
        
        // Get tables for this database
        const tables = await this.getTables(connection, database)
        console.log(`    Found ${tables.length} tables in schema ${schema}`)
        
        for (const table of tables) {
          console.log(`      Processing table: ${table}`)
          
          // Get table structure
          const columns = await this.getTableStructure(connection, database, table)
          
          // Analyze columns with LLM if enabled
          if (this.llmAnalyzer.enabled) {
            try {
              const analyzedColumns = await this.llmAnalyzer.analyzeTableStructure(
                table,
                columns,
                database,
                schema
              )
              columns.splice(0, columns.length, ...analyzedColumns)
            } catch (error) {
              console.log(`      Warning: LLM analysis failed for table ${table}: ${error.message}`)
            }
          } else {
            console.log(`      Skipping LLM analysis for table: ${table}`)
          }
          
          metadata.databases[database].schemas[schema].tables[table] = {
            columns: columns,
            column_count: columns.length
          }
        }
      }
    }
    
    return metadata
  }
}

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
          connectionId, 
          connection,
          aiAnalysisEnabled = true
        } = JSON.parse(event.body)

        if (!connection) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: 'Connection details are required' })
          })
        }

        console.log('Enhanced schema sync started for connection:', connection.name)

        // Create or update connection in Supabase
        let connectionRecord
        if (connectionId === 'new') {
          const { data, error } = await supabase
            .from('data_source_connections')
            .insert({
              name: connection.name,
              type: connection.type,
              description: connection.description,
              connection_config: connection.connection_config,
              organization_id: 'demo-org', // TODO: Get from auth
              created_by: 'demo-user' // TODO: Get from auth
            })
            .select()
            .single()

          if (error) {
            console.error('Error creating connection:', error)
            return resolve({
              statusCode: 500,
              body: JSON.stringify({ error: 'Failed to create connection' })
            })
          }
          connectionRecord = data
        } else {
          const { data, error } = await supabase
            .from('data_source_connections')
            .select('*')
            .eq('id', connectionId)
            .single()

          if (error || !data) {
            return resolve({
              statusCode: 404,
              body: JSON.stringify({ error: 'Connection not found' })
            })
          }
          connectionRecord = data
        }

        // Create metadata extraction job
        const { data: jobData, error: jobError } = await supabase
          .from('metadata_extraction_jobs')
          .insert({
            connection_id: connectionRecord.id,
            status: 'running',
            ai_analysis_enabled: aiAnalysisEnabled,
            started_at: new Date().toISOString(),
            created_by: 'demo-user' // TODO: Get from auth
          })
          .select()
          .single()

        if (jobError) {
          console.error('Error creating extraction job:', jobError)
        }

        try {
          // Extract comprehensive metadata
          const extractor = new EnhancedMetadataExtractor()
          const metadata = await extractor.extractComprehensiveMetadata(connection)

          // Store metadata in Supabase
          await this.storeComprehensiveMetadata(connectionRecord.id, metadata)

          // Update job status
          if (jobData) {
            await supabase
              .from('metadata_extraction_jobs')
              .update({
                status: 'completed',
                progress_percentage: 100,
                completed_at: new Date().toISOString(),
                metadata: { extraction_summary: metadata }
              })
              .eq('id', jobData.id)
          }

          return resolve({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              message: 'Comprehensive metadata extraction completed successfully',
              connection_id: connectionRecord.id,
              metadata_summary: {
                databases: Object.keys(metadata.databases).length,
                tables: Object.values(metadata.databases).reduce((total, db) => 
                  total + Object.values(db.schemas).reduce((dbTotal, schema) => 
                    dbTotal + Object.keys(schema.tables).length, 0), 0),
                columns: Object.values(metadata.databases).reduce((total, db) => 
                  total + Object.values(db.schemas).reduce((dbTotal, schema) => 
                    dbTotal + Object.values(schema.tables).reduce((schemaTotal, table) => 
                      schemaTotal + table.column_count, 0), 0), 0)
              }
            })
          })

        } catch (extractionError) {
          console.error('Metadata extraction failed:', extractionError)

          // Update job status
          if (jobData) {
            await supabase
              .from('metadata_extraction_jobs')
              .update({
                status: 'failed',
                error_message: extractionError.message,
                completed_at: new Date().toISOString()
              })
              .eq('id', jobData.id)
          }

          return resolve({
            statusCode: 500,
            body: JSON.stringify({ 
              error: 'Metadata extraction failed',
              details: extractionError.message
            })
          })
        }

      } catch (error) {
        console.error('Error in enhanced schema sync:', error)
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        })
      }
    })
  })
}

async function storeComprehensiveMetadata(connectionId, metadata) {
  console.log('Storing comprehensive metadata in Supabase...')

  for (const [databaseName, database] of Object.entries(metadata.databases)) {
    // Create or update database schema
    const { data: schemaData, error: schemaError } = await supabase
      .from('data_source_schemas')
      .upsert({
        connection_id: connectionId,
        name: databaseName,
        type: 'database',
        description: `Database: ${databaseName}`,
        metadata: { database_info: database }
      }, { onConflict: 'connection_id,name' })
      .select()
      .single()

    if (schemaError) {
      console.error(`Error creating schema for ${databaseName}:`, schemaError)
      continue
    }

    for (const [schemaName, schema] of Object.entries(database.schemas)) {
      for (const [tableName, table] of Object.entries(schema.tables)) {
        // Create or update table object
        const { data: objectData, error: objectError } = await supabase
          .from('data_source_objects')
          .upsert({
            schema_id: schemaData.id,
            name: tableName,
            type: 'table',
            description: `Table: ${tableName}`,
            row_count: null, // TODO: Get actual row count
            metadata: { table_info: table }
          }, { onConflict: 'schema_id,name' })
          .select()
          .single()

        if (objectError) {
          console.error(`Error creating object for ${tableName}:`, objectError)
          continue
        }

        // Create or update columns
        for (const column of table.columns) {
          const { error: fieldError } = await supabase
            .from('data_source_fields')
            .upsert({
              object_id: objectData.id,
              name: column.name,
              data_type: column.type,
              is_nullable: column.is_nullable !== false,
              default_type: column.default_type,
              default_expression: column.default_expression,
              comment: column.comment,
              codec_expression: column.codec_expression,
              ttl_expression: column.ttl_expression,
              description: column.comment,
              ai_description: column.ai_definition,
              business_definition: column.ai_definition, // Use AI definition as business definition
              metadata: { column_info: column }
            }, { onConflict: 'object_id,name' })

          if (fieldError) {
            console.error(`Error creating field for ${column.name}:`, fieldError)
          }
        }
      }
    }
  }

  console.log('Comprehensive metadata storage completed')
}
