import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import AdminDashboard from './pages/AdminDashboard'
import CustomerCheckin from './pages/CustomerCheckin'

// Socket connection
const socket = io(window.location.origin, {
  path: '/socket.io'
})

function App() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    return () => {
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [])

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<CustomerCheckin socket={socket} />} />
        <Route path="/admin" element={<AdminDashboard socket={socket} />} />
      </Routes>

      {/* Connection indicator */}
      <div className={`fixed bottom-4 right-4 px-3 py-1 rounded-full text-sm ${
        connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {connected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  )
}

export default App
