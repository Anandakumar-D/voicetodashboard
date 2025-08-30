import { useState, useEffect } from 'react'
import { Plus, Database, Edit, Trash2, RefreshCw, X, Check } from 'lucide-react'

interface DataSourceConnection {
  id: string
  name: string
  type: string
  description: string
  is_active: boolean
  created_at: string
}

export function Connections() {
  const [connections, setConnections] = useState<DataSourceConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  
  const dataSourceTypes = [
    { id: 'clickhouse', name: 'ClickHouse', icon: '🐘', description: 'High-performance columnar database' },
    { id: 'mysql', name: 'MySQL', icon: '🐬', description: 'Popular open-source relational database' },
    { id: 'postgresql', name: 'PostgreSQL', icon: '🐘', description: 'Advanced open-source database' },
    { id: 'mongodb', name: 'MongoDB', icon: '🍃', description: 'Document-based NoSQL database' },
    { id: 'snowflake', name: 'Snowflake', icon: '❄️', description: 'Cloud data platform' },
    { id: 'bigquery', name: 'BigQuery', icon: '☁️', description: 'Google Cloud data warehouse' }
  ]

  useEffect(() => {
    // TODO: Fetch connections from Supabase
    setConnections([
      {
        id: '1',
        name: 'Production ClickHouse',
        type: 'clickhouse',
        description: 'Main production database',
        is_active: true,
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        name: 'Analytics MySQL',
        type: 'mysql',
        description: 'Analytics database',
        is_active: true,
        created_at: '2024-01-10T14:20:00Z'
      }
    ])
    setLoading(false)
  }, [])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'clickhouse':
        return '🐘'
      case 'mysql':
        return '🐬'
      case 'postgresql':
        return '🐘'
      case 'mongodb':
        return '🍃'
      default:
        return '🔗'
    }
  }

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const handleAddConnection = () => {
    setShowAddModal(true)
  }

  const handleSelectType = (type: string) => {
    setSelectedType(type)
    // For now, just close the modal and show a success message
    setShowAddModal(false)
    alert(`Selected ${type} connection type. In a real implementation, this would open a configuration form.`)
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
          <h1 className="text-2xl font-semibold text-gray-900">Data Sources</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your data source connections
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleAddConnection}>
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {connections.map((connection) => (
          <div key={connection.id} className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getTypeIcon(connection.type)}</span>
                  <div>
                    <h3 className="card-title text-lg">{connection.name}</h3>
                    <p className="text-sm text-gray-500">
                      {getTypeLabel(connection.type)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="card-content">
              <p className="text-sm text-gray-600 mb-4">
                {connection.description}
              </p>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  connection.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {connection.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(connection.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {connections.length === 0 && (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No connections</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first data source connection.
          </p>
          <div className="mt-6">
            <button className="btn btn-primary" onClick={handleAddConnection}>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </button>
          </div>
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Data Source Connection</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-3">
                {dataSourceTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{type.name}</h4>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </div>
                      <Check className="h-5 w-5 text-primary-600 opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
