import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Database, Table, Hash } from 'lucide-react'

interface SchemaData {
  id: string
  name: string
  type: string
  objects: Array<{
    id: string
    name: string
    type: string
    fields: Array<{
      id: string
      name: string
      data_type: string
      description?: string
    }>
  }>
}

export function Schema() {
  const [schemas, setSchemas] = useState<SchemaData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set())

  const fetchSchemas = async () => {
    try {
      setLoading(true)
      // Fetch comprehensive schemas from the backend
      const response = await fetch('/.netlify/functions/get-comprehensive-schemas')
      if (response.ok) {
        const data = await response.json()
        setSchemas(data.schemas || [])
      } else {
        // Fallback to mock data if the endpoint doesn't exist
        setSchemas([
          {
            id: '1',
            name: 'default',
            type: 'database',
            objects: [
              {
                id: '1',
                name: 'system',
                type: 'table',
                fields: [
                  { 
                    id: '1', 
                    name: 'name', 
                    data_type: 'String', 
                    description: 'System name',
                    ai_description: 'System name identifier',
                    business_definition: 'System name identifier',
                    comment: 'System name',
                    default_expression: null,
                    codec_expression: null,
                    ttl_expression: null
                  },
                  { 
                    id: '2', 
                    name: 'value', 
                    data_type: 'String', 
                    description: 'System value',
                    ai_description: 'System configuration value',
                    business_definition: 'System configuration value',
                    comment: 'System value',
                    default_expression: null,
                    codec_expression: null,
                    ttl_expression: null
                  }
                ]
              }
            ]
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching schemas:', error)
      // Fallback to mock data
      setSchemas([
        {
          id: '1',
          name: 'default',
          type: 'database',
          objects: [
            {
              id: '1',
              name: 'system',
              type: 'table',
              fields: [
                { 
                  id: '1', 
                  name: 'name', 
                  data_type: 'String', 
                  description: 'System name',
                  ai_description: 'System name identifier',
                  business_definition: 'System name identifier'
                },
                { 
                  id: '2', 
                  name: 'value', 
                  data_type: 'String', 
                  description: 'System value',
                  ai_description: 'System configuration value',
                  business_definition: 'System configuration value'
                }
              ]
            }
          ]
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchemas()
  }, [])

  const toggleSchema = (schemaId: string) => {
    const newExpanded = new Set(expandedSchemas)
    if (newExpanded.has(schemaId)) {
      newExpanded.delete(schemaId)
    } else {
      newExpanded.add(schemaId)
    }
    setExpandedSchemas(newExpanded)
  }

  const toggleObject = (objectId: string) => {
    const newExpanded = new Set(expandedObjects)
    if (newExpanded.has(objectId)) {
      newExpanded.delete(objectId)
    } else {
      newExpanded.add(objectId)
    }
    setExpandedObjects(newExpanded)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'database':
        return <Database className="h-4 w-4" />
      case 'table':
        return <Table className="h-4 w-4" />
      case 'column':
        return <Hash className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Schema Explorer</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and manage your data schemas
          </p>
        </div>
        <button className="btn btn-primary">
          Sync Schema
        </button>
      </div>

      <div className="card">
        <div className="card-content">
          <div className="space-y-2">
            {schemas.map((schema) => (
              <div key={schema.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSchema(schema.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    {expandedSchemas.has(schema.id) ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    {getTypeIcon(schema.type)}
                    <span className="font-medium text-gray-900">{schema.name}</span>
                    <span className="text-sm text-gray-500">({schema.type})</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {schema.objects.length} objects
                  </span>
                </button>
                
                {expandedSchemas.has(schema.id) && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {schema.objects.map((object) => (
                      <div key={object.id} className="ml-8 border-l border-gray-200">
                        <button
                          onClick={() => toggleObject(object.id)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            {expandedObjects.has(object.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            {getTypeIcon(object.type)}
                            <span className="font-medium text-gray-900">{object.name}</span>
                            <span className="text-sm text-gray-500">({object.type})</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {object.fields.length} fields
                          </span>
                        </button>
                        
                        {expandedObjects.has(object.id) && (
                          <div className="ml-8 border-l border-gray-200 bg-white">
                            {object.fields.map((field) => (
                              <div key={field.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      {getTypeIcon('column')}
                                      <span className="font-medium text-gray-900">{field.name}</span>
                                      <span className="text-sm text-gray-500">({field.data_type})</span>
                                      {field.is_primary_key && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          Primary Key
                                        </span>
                                      )}
                                      {field.is_indexed && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Indexed
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Business Definition */}
                                    {field.business_definition && (
                                      <div className="ml-8 mb-2">
                                        <div className="text-sm font-medium text-gray-700 mb-1">Business Definition:</div>
                                        <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                                          {field.business_definition}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* AI Description */}
                                    {field.ai_description && field.ai_description !== field.business_definition && (
                                      <div className="ml-8 mb-2">
                                        <div className="text-sm font-medium text-gray-700 mb-1">AI Analysis:</div>
                                        <div className="text-sm text-gray-600 bg-purple-50 p-2 rounded">
                                          {field.ai_description}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Technical Details */}
                                    <div className="ml-8">
                                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                                        {field.comment && (
                                          <div>
                                            <span className="font-medium">Comment:</span> {field.comment}
                                          </div>
                                        )}
                                        {field.default_expression && (
                                          <div>
                                            <span className="font-medium">Default:</span> {field.default_expression}
                                          </div>
                                        )}
                                        {field.codec_expression && (
                                          <div>
                                            <span className="font-medium">Codec:</span> {field.codec_expression}
                                          </div>
                                        )}
                                        {field.ttl_expression && (
                                          <div>
                                            <span className="font-medium">TTL:</span> {field.ttl_expression}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {schemas.length === 0 && (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No schemas found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect a data source and sync its schema to get started.
          </p>
          <div className="mt-6">
            <button className="btn btn-primary">
              Add Data Source
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
