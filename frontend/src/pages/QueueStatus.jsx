import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

export default function QueueStatus({ socket }) {
  const { id } = useParams()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    fetchStatus()

    // Join queue room for real-time updates
    socket.emit('join-queue', parseInt(id))

    // Listen for updates
    socket.on('queue-updated', (queue) => {
      const updated = queue.find((e) => e.id === parseInt(id))
      if (updated) {
        setEntry((prev) => ({ ...prev, ...updated }))
      }
    })

    socket.on('notification', (data) => {
      setNotification(data)
      // Refresh status
      fetchStatus()
    })

    return () => {
      socket.off('queue-updated')
      socket.off('notification')
    }
  }, [id])

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/queue/${id}`)
      if (res.ok) {
        const data = await res.json()
        setEntry(data)
      }
    } catch (err) {
      console.error('Failed to fetch status:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h1>
          <p className="text-gray-600">This queue entry doesn't exist.</p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to check-in
          </a>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'notified': return 'bg-blue-100 text-blue-800'
      case 'assigned': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'no_show': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting': return 'In Queue'
      case 'notified': return 'Your Turn!'
      case 'assigned': return 'Lane Assigned'
      case 'completed': return 'Session Complete'
      case 'no_show': return 'No Show'
      default: return status
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        {/* Notification Modal */}
        {notification && notification.type === 'lane-assigned' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full animate-bounce">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Lane is Ready!</h2>
              <p className="text-lg text-gray-600 mb-4">{notification.laneName}</p>
              <p className="text-gray-500 mb-6">Please check in at the front desk.</p>
              <button
                onClick={() => setNotification(null)}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700"
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(entry.status)}`}>
            {getStatusText(entry.status)}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{entry.customerName}</h1>

        {entry.status === 'waiting' && entry.position && (
          <>
            <div className="my-8">
              <div className="text-6xl font-bold text-blue-600">#{entry.position}</div>
              <p className="text-gray-500 mt-2">Your position in queue</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600">
                We'll notify you on screen and via email when your lane is ready.
              </p>
            </div>
          </>
        )}

        {entry.status === 'assigned' && entry.currentLane && (
          <div className="my-8">
            <div className="text-4xl font-bold text-green-600">{entry.currentLane.name}</div>
            <p className="text-gray-500 mt-2">Head to your assigned lane</p>
          </div>
        )}

        {entry.status === 'completed' && (
          <div className="my-8">
            <p className="text-gray-600">Thanks for visiting! Hope to see you again.</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Party size: {entry.partySize} {entry.partySize === 1 ? 'person' : 'people'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Checked in: {new Date(entry.createdAt).toLocaleTimeString()}
          </p>
        </div>

        <a href="/" className="text-blue-600 hover:underline text-sm mt-6 inline-block">
          Start new check-in
        </a>
      </div>
    </div>
  )
}
