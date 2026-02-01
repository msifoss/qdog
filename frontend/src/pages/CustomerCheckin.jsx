import { useState, useEffect } from 'react'

export default function CustomerCheckin({ socket }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [queueCount, setQueueCount] = useState(null)
  const [publicQueue, setPublicQueue] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(null) // { position, handle, avatar } when successfully added

  useEffect(() => {
    fetchQueueCount()
    fetchPublicQueue()

    // Listen for queue updates to keep count current
    socket.on('queue-updated', () => {
      fetchQueueCount()
      fetchPublicQueue()
    })

    return () => {
      socket.off('queue-updated')
    }
  }, [])

  const fetchQueueCount = async () => {
    try {
      const res = await fetch('/api/queue/count')
      const data = await res.json()
      setQueueCount(data.count)
    } catch (err) {
      console.error('Failed to fetch queue count:', err)
    }
  }

  const fetchPublicQueue = async () => {
    try {
      const res = await fetch('/api/queue/public')
      const data = await res.json()
      setPublicQueue(data)
    } catch (err) {
      console.error('Failed to fetch public queue:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || loading) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: name.trim(), email: email.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          // Already in queue
          setError(`You're already in the queue at position #${data.position}`)
        } else {
          throw new Error(data.error || 'Failed to join queue')
        }
        return
      }

      setAdded({
        position: data.position,
        handle: data.entry.handle,
        avatar: data.entry.avatar
      })
      setName('')
      setEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAnother = () => {
    setAdded(null)
  }

  // Success state - show confirmation
  if (added) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700 mx-auto mb-4 ring-4 ring-green-500">
            <img
              src={`/avatars/${added.avatar}.png`}
              alt={added.handle}
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">You're in the Queue!</h1>
          <p className="text-lg font-medium text-gray-600 mb-4">
            Your callsign: <span className="text-blue-600">{added.handle}</span>
          </p>

          <div className="bg-blue-50 rounded-xl p-6 my-6">
            <p className="text-sm text-blue-600 mb-1">Your position</p>
            <p className="text-5xl font-bold text-blue-600">#{added.position}</p>
            {added.position === 1 ? (
              <p className="text-sm text-blue-600 mt-2">You're next!</p>
            ) : (
              <p className="text-sm text-blue-600 mt-2">
                {added.position - 1} {added.position - 1 === 1 ? 'person' : 'people'} ahead of you
              </p>
            )}
          </div>

          <p className="text-gray-600 mb-6">
            Listen for your callsign! We'll announce <strong>{added.handle}</strong> when it's your turn.
          </p>

          <button
            onClick={handleAddAnother}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Add Another Person
          </button>
        </div>
      </div>
    )
  }

  // Default state - show form
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-white">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join the Queue</h1>

          {queueCount !== null && (
            <div className="mt-4 inline-block bg-blue-50 rounded-lg px-4 py-2">
              {queueCount === 0 ? (
                <p className="text-blue-600 font-medium">No wait - you'll be first!</p>
              ) : (
                <p className="text-blue-600 font-medium">
                  {queueCount} {queueCount === 1 ? 'person' : 'people'} currently waiting
                </p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="Enter your name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="your@email.com"
            />
            <p className="text-xs text-gray-500 mt-1">One spot per email address</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || !email.trim() || loading}
            className="w-full bg-blue-600 text-white py-4 px-4 rounded-lg font-medium text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Joining...' : 'Join Queue'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          <a href="/admin" className="text-blue-600 hover:underline">Admin Dashboard</a>
        </p>
      </div>

      {/* Public Queue Display */}
      {publicQueue.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mt-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Current Queue</h2>
          <div className="space-y-2">
            {publicQueue.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                }`}
              >
                {/* Position */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {index + 1}
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                  <img
                    src={`/avatars/${entry.avatar}.png`}
                    alt={entry.handle}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Handle */}
                <span className={`font-medium ${index === 0 ? 'text-green-700' : 'text-gray-700'}`}>
                  {entry.handle}
                </span>

                {index === 0 && (
                  <span className="ml-auto text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                    Next up
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
