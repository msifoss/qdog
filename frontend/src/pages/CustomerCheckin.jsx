import { useState, useEffect } from 'react'

export default function CustomerCheckin({ socket }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sex, setSex] = useState('male')
  const [preview, setPreview] = useState(null)
  const [queueCount, setQueueCount] = useState(null)
  const [publicQueue, setPublicQueue] = useState([])
  const [loading, setLoading] = useState(false)
  const [rerolling, setRerolling] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(null)

  useEffect(() => {
    fetchQueueCount()
    fetchPublicQueue()

    socket.on('queue-updated', () => {
      fetchQueueCount()
      fetchPublicQueue()
    })

    return () => {
      socket.off('queue-updated')
    }
  }, [])

  // Fetch preview when sex changes
  useEffect(() => {
    fetchPreview()
  }, [sex])

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

  const fetchPreview = async () => {
    try {
      const res = await fetch(`/api/queue/preview?sex=${sex}`)
      const data = await res.json()
      setPreview(data)
    } catch (err) {
      console.error('Failed to fetch preview:', err)
    }
  }

  const handleReroll = async () => {
    setRerolling(true)
    await fetchPreview()
    setRerolling(false)
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
        body: JSON.stringify({
          customerName: name.trim(),
          email: email.trim(),
          sex,
          handle: preview?.handle,
          avatar: preview?.avatar
        })
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
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
      setPreview(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAnother = () => {
    setAdded(null)
    setSex('male')
    fetchPreview()
  }

  // Success state
  if (added) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
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

  // Form state
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start p-4 pt-8 gap-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
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

        {/* Avatar Preview */}
        {preview && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 text-center mb-3">Your callsign preview</p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 ring-2 ring-blue-500">
                <img
                  src={`/avatars/${preview.avatar}.png`}
                  alt={preview.handle}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{preview.handle}</p>
                <button
                  type="button"
                  onClick={handleReroll}
                  disabled={rerolling}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                >
                  <svg className={`w-4 h-4 ${rerolling ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {rerolling ? 'Rolling...' : 'Re-roll'}
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sex Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Avatar Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSex('male')}
                className={`py-3 px-4 rounded-lg font-medium border-2 transition-all ${
                  sex === 'male'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-xl mr-2">🦅</span> Male
              </button>
              <button
                type="button"
                onClick={() => setSex('female')}
                className={`py-3 px-4 rounded-lg font-medium border-2 transition-all ${
                  sex === 'female'
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-xl mr-2">🦢</span> Female
              </button>
            </div>
          </div>

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
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Current Queue</h2>
          <div className="space-y-2">
            {publicQueue.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {index + 1}
                </div>

                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                  <img
                    src={`/avatars/${entry.avatar}.png`}
                    alt={entry.handle}
                    className="w-full h-full object-cover"
                  />
                </div>

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
