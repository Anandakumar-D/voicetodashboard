import { useState, useEffect } from 'react'
import { Plus, Database, Edit, Trash2, RefreshCw, X, Check, ArrowLeft } from 'lucide-react'

interface DataSourceConnection {
  id: string
  name: string
  type: string
  description: string
  is_active: boolean
  created_at: string
}

interface ConnectionForm {
  name: string
  type: string
  host: string
  port: string
  database: string
  username: string
  password: string
  description: string
}

export function Connections() {
  const [connections, setConnections] = useState<DataSourceConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConnectionForm, setShowConnectionForm] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [formData, setFormData] = useState<ConnectionForm>({
    name: '',
    type: '',
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    description: ''
  })
  const [isConnecting, setIsConnecting] = useState(false)
  
  const dataSourceTypes = [
    { 
      id: 'clickhouse', 
      name: 'ClickHouse', 
      icon: '🐘', 
      description: 'High-performance columnar database',
      defaultPort: '8123'
    },
    { 
      id: 'mysql', 
      name: 'MySQL', 
      icon: '🐬', 
      description: 'Popular open-source relational database',
      defaultPort: '3306'
    },
    { 
      id: 'postgresql', 
      name: 'PostgreSQL', 
      icon: '🐘', 
      description: 'Advanced open-source database',
      defaultPort: '5432'
    },
    { 
      id: 'mongodb', 
      name: 'MongoDB', 
      icon: '🍃', 
      description: 'Document-based NoSQL database',
      defaultPort: '27017'
    },
    { 
      id: 'snowflake', 
      name: 'Snowflake', 
      icon: '❄️', 
      description: 'Cloud data platform',
      defaultPort: '443'
    },
    { 
      id: 'bigquery', 
      name: 'BigQuery', 
      icon: '☁️', 
      description: 'Google Cloud data warehouse',
      defaultPort: '443'
    }
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
    const selectedDataSource = dataSourceTypes.find(ds => ds.id === type)
    setSelectedType(type)
    setFormData(prev => ({
      ...prev,
      type: type,
      port: selectedDataSource?.defaultPort || ''
    }))
    setShowAddModal(false)
    setShowConnectionForm(true)
  }

  const handleFormChange = (field: keyof ConnectionForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleTestConnection = async () => {
    setIsConnecting(true)
    try {
      // Test connection via MindsDB MCP
      const response = await fetch('/.netlify/functions/schema-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectionId: 'test',
          connection: {
            type: formData.type,
            connection_config: {
              host: formData.host,
              port: parseInt(formData.port),
              database: formData.database,
              username: formData.username,
              password: formData.password
            }
          }
        })
      })

      if (response.ok) {
        alert('✅ Connection successful! Your data source is ready to use.')
      } else {
        const error = await response.json()
        alert(`❌ Connection failed: ${error.error}`)
      }
    } catch (error) {
      alert(`❌ Connection failed: ${error}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSaveConnection = async () => {
    setIsConnecting(true)
    try {
      // Save connection to Supabase and test via MindsDB
      const response = await fetch('/.netlify/functions/schema-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectionId: 'new',
          connection: {
            name: formData.name,
            type: formData.type,
            description: formData.description,
            connection_config: {
              host: formData.host,
              port: parseInt(formData.port),
              database: formData.database,
              username: formData.username,
              password: formData.password
            }
          }
        })
      })

      if (response.ok) {
        alert('✅ Connection saved and tested successfully!')
        setShowConnectionForm(false)
        setFormData({
          name: '',
          type: '',
          host: '',
          port: '',
          database: '',
          username: '',
          password: '',
          description: ''
        })
        // TODO: Refresh connections list
      } else {
        const error = await response.json()
        alert(`❌ Failed to save connection: ${error.error}`)
      }
    } catch (error) {
      alert(`❌ Failed to save connection: ${error}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleBackToTypes = () => {
    setShowConnectionForm(false)
    setShowAddModal(true)
    setFormData({
      name: '',
      type: '',
      host: '',
      port: '',
      database: '',
      username: '',
      password: '',
      description: ''
    })
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

      {/* Data Source Type Selection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Select Data Source Type</h3>
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
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">{type.name}</h4>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </div>
                      <Check className="h-5 w-5 text-primary-600 ml-auto opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Form Modal */}
      {showConnectionForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleBackToTypes}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h3 className="text-lg font-medium text-gray-900">
                    Configure {getTypeLabel(selectedType)} Connection
                  </h3>
                </div>
                <button
                  onClick={() => setShowConnectionForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="input w-full"
                    placeholder="e.g., Production ClickHouse"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    className="input w-full"
                    placeholder="Brief description of this connection"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Host
                    </label>
                    <input
                      type="text"
                      value={formData.host}
                      onChange={(e) => handleFormChange('host', e.target.value)}
                      className="input w-full"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Port
                    </label>
                    <input
                      type="text"
                      value={formData.port}
                      onChange={(e) => handleFormChange('port', e.target.value)}
                      className="input w-full"
                      placeholder="8123"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Database
                  </label>
                  <input
                    type="text"
                    value={formData.database}
                    onChange={(e) => handleFormChange('database', e.target.value)}
                    className="input w-full"
                    placeholder="default"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleFormChange('username', e.target.value)}
                      className="input w-full"
                      placeholder="default"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleFormChange('password', e.target.value)}
                      className="input w-full"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleTestConnection}
                    disabled={isConnecting}
                    className="btn btn-secondary flex-1"
                  >
                    {isConnecting ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleSaveConnection}
                    disabled={isConnecting || !formData.name || !formData.host}
                    className="btn btn-primary flex-1"
                  >
                    {isConnecting ? 'Saving...' : 'Save Connection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
