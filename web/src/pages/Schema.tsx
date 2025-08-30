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

  useEffect(() => {
    // TODO: Fetch schemas from Supabase
    setSchemas([
      {
        id: '1',
        name: 'analytics',
        type: 'database',
        objects: [
          {
            id: '1',
            name: 'users',
            type: 'table',
            fields: [
              { id: '1', name: 'id', data_type: 'UInt64', description: 'User ID' },
              { id: '2', name: 'email', data_type: 'String', description: 'User email' },
              { id: '3', name: 'created_at', data_type: 'DateTime', description: 'Creation timestamp' }
            ]
          },
          {
            id: '2',
            name: 'events',
            type: 'table',
            fields: [
              { id: '4', name: 'id', data_type: 'UInt64', description: 'Event ID' },
              { id: '5', name: 'user_id', data_type: 'UInt64', description: 'User ID' },
              { id: '6', name: 'event_type', data_type: 'String', description: 'Type of event' },
              { id: '7', name: 'timestamp', data_type: 'DateTime', description: 'Event timestamp' }
            ]
          }
        ]
      },
      {
        id: '2',
        name: 'marketing',
        type: 'database',
        objects: [
          {
            id: '3',
            name: 'campaigns',
            type: 'table',
            fields: [
              { id: '8', name: 'id', data_type: 'UInt64', description: 'Campaign ID' },
              { id: '9', name: 'name', data_type: 'String', description: 'Campaign name' },
              { id: '10', name: 'status', data_type: 'String', description: 'Campaign status' }
            ]
          }
        ]
      }
    ])
    setLoading(false)
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
                              <div key={field.id} className="px-4 py-2 hover:bg-gray-50 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {getTypeIcon('column')}
                                  <span className="font-medium text-gray-900">{field.name}</span>
                                  <span className="text-sm text-gray-500">({field.data_type})</span>
                                  {field.description && (
                                    <span className="text-sm text-gray-400">- {field.description}</span>
                                  )}
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
