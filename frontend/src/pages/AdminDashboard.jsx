import { useState, useEffect } from 'react'
import Avatar from '../components/Avatar'

export default function AdminDashboard({ socket }) {
  const [queue, setQueue] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [draggedItem, setDraggedItem] = useState(null)

  // Add form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    fetchData()

    socket.on('queue-updated', setQueue)

    return () => {
      socket.off('queue-updated')
    }
  }, [])

  const fetchData = async () => {
    try {
      const [queueRes, settingsRes] = await Promise.all([
        fetch('/api/queue'),
        fetch('/api/settings')
      ])
      setQueue(await queueRes.json())
      setSettings(await settingsRes.json())
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const addToQueue = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim() || adding) return

    setAdding(true)
    setAddError('')
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: newName.trim(), email: newEmail.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          setAddError(`Email already in queue at position #${data.position}`)
        } else {
          setAddError(data.error || 'Failed to add')
        }
        return
      }
      setNewName('')
      setNewEmail('')
    } catch (err) {
      console.error('Failed to add:', err)
      setAddError('Failed to add to queue')
    } finally {
      setAdding(false)
    }
  }

  const removeFromQueue = async (id) => {
    try {
      await fetch(`/api/queue/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to remove:', err)
    }
  }

  const moveUp = async (id) => {
    try {
      await fetch(`/api/queue/${id}/move-up`, { method: 'POST' })
    } catch (err) {
      console.error('Failed to move up:', err)
    }
  }

  const moveDown = async (id) => {
    try {
      await fetch(`/api/queue/${id}/move-down`, { method: 'POST' })
    } catch (err) {
      console.error('Failed to move down:', err)
    }
  }

  const handleDragStart = (e, index) => {
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index) return

    const newQueue = [...queue]
    const [draggedEntry] = newQueue.splice(draggedItem, 1)
    newQueue.splice(index, 0, draggedEntry)
    setQueue(newQueue)
    setDraggedItem(index)
  }

  const handleDragEnd = async () => {
    if (draggedItem === null) return

    try {
      await fetch('/api/queue/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: queue.map(e => e.id) })
      })
    } catch (err) {
      console.error('Failed to reorder:', err)
      fetchData() // Refresh on error
    }
    setDraggedItem(null)
  }

  const saveSettings = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      setSettings(await res.json())
      setShowSettings(false)
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-white">Q</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{settings?.businessName || 'QDog'}</h1>
              <p className="text-sm text-gray-500">Queue Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Customer View
            </a>
            <button
              onClick={() => setShowSettings(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow">
          {/* Add to Queue Form */}
          <div className="p-4 border-b border-gray-200">
            <form onSubmit={addToQueue} className="flex gap-3 flex-wrap">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="flex-1 min-w-[150px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email"
                className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newName.trim() || !newEmail.trim() || adding}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </form>
            {addError && (
              <p className="text-red-600 text-sm mt-2">{addError}</p>
            )}
          </div>

          {/* Queue Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Queue</h2>
            <span className="text-sm text-gray-500">{queue.length} {queue.length === 1 ? 'person' : 'people'}</span>
          </div>

          {/* Queue List */}
          {queue.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">Queue is empty</p>
              <p className="text-sm mt-1">Add someone above to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {queue.map((entry, index) => (
                <div
                  key={entry.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-grab active:cursor-grabbing ${
                    draggedItem === index ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                    </svg>
                  </div>

                  {/* Position */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    <Avatar
                      avatar={entry.avatar}
                      handle={entry.handle}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Name, Handle & Email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{entry.customerName}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {entry.handle}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 truncate">{entry.email}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    {/* Move Up */}
                    <button
                      onClick={() => moveUp(entry.id)}
                      disabled={index === 0}
                      className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => moveDown(entry.id)}
                      disabled={index === queue.length - 1}
                      className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromQueue(entry.id)}
                      className="p-1.5 rounded hover:bg-red-100 text-red-500 hover:text-red-700"
                      title="Remove from queue"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && settings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Settings</h2>
            <form onSubmit={saveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
