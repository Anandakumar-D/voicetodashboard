import { useState, useEffect } from 'react'
import { BarChart3, Database, Users, Activity } from 'lucide-react'

interface DashboardStats {
  totalConnections: number
  totalSchemas: number
  totalObjects: number
  recentQueries: number
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalConnections: 0,
    totalSchemas: 0,
    totalObjects: 0,
    recentQueries: 0
  })

  useEffect(() => {
    // TODO: Fetch actual stats from Supabase
    setStats({
      totalConnections: 2,
      totalSchemas: 5,
      totalObjects: 25,
      recentQueries: 12
    })
  }, [])

  const statCards = [
    {
      name: 'Data Sources',
      value: stats.totalConnections,
      icon: Database,
      color: 'bg-blue-500'
    },
    {
      name: 'Schemas',
      value: stats.totalSchemas,
      icon: BarChart3,
      color: 'bg-green-500'
    },
    {
      name: 'Objects',
      value: stats.totalObjects,
      icon: Activity,
      color: 'bg-purple-500'
    },
    {
      name: 'Recent Queries',
      value: stats.recentQueries,
      icon: Users,
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to Auralytics - Your data analytics platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
            <p className="card-description">
              Common tasks to get you started
            </p>
          </div>
          <div className="card-content space-y-4">
            <button className="btn btn-primary w-full">
              Add New Data Source
            </button>
            <button className="btn btn-outline w-full">
              Sync Schema
            </button>
            <button className="btn btn-outline w-full">
              Create Dashboard
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
            <p className="card-description">
              Your latest queries and actions
            </p>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Schema synced successfully
                  </p>
                  <p className="text-sm text-gray-500">
                    2 minutes ago
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Database className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    New ClickHouse connection added
                  </p>
                  <p className="text-sm text-gray-500">
                    1 hour ago
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Query executed: "Show me user data"
                  </p>
                  <p className="text-sm text-gray-500">
                    3 hours ago
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
