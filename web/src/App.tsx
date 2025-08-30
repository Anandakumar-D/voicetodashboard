import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Schema } from './pages/Schema'
import { Connections } from './pages/Connections'
import { ChatInterface } from './pages/ChatInterface'
import { Settings } from './pages/Settings'

function App() {
  return (
    <Routes>
      {/* Default entry: redirect to login */}
      <Route index element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      
      {/* App routes - no auth required for now */}
      <Route path="/app" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="schema" element={<Schema />} />
        <Route path="connections" element={<Connections />} />
        <Route path="chat" element={<ChatInterface />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      
      {/* Fallback: anything else -> login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App