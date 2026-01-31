import { useState, useEffect } from 'react'

export default function AdminDashboard({ socket }) {
  const [lanes, setLanes] = useState([])
  const [queue, setQueue] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    fetchData()

    // Join admin room
    socket.emit('join-admin')

    // Listen for updates
    socket.on('lanes-updated', setLanes)
    socket.on('queue-updated', setQueue)

    return () => {
      socket.off('lanes-updated')
      socket.off('queue-updated')
    }
  }, [])

  const fetchData = async () => {
    try {
      const [lanesRes, queueRes, settingsRes] = await Promise.all([
        fetch('/api/lanes'),
        fetch('/api/queue?status=waiting'),
        fetch('/api/settings')
      ])

      setLanes(await lanesRes.json())
      setQueue(await queueRes.json())
      setSettings(await settingsRes.json())
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const releaseLane = async (laneId) => {
    try {
      await fetch(`/api/lanes/${laneId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callNext: true })
      })
    } catch (err) {
      console.error('Failed to release lane:', err)
    }
  }

  const assignLane = async (laneId, queueEntryId) => {
    try {
      await fetch(`/api/lanes/${laneId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueEntryId })
      })
    } catch (err) {
      console.error('Failed to assign lane:', err)
    }
  }

  const markNoShow = async (entryId) => {
    try {
      await fetch(`/api/queue/${entryId}/no-show`, { method: 'POST' })
    } catch (err) {
      console.error('Failed to mark no-show:', err)
    }
  }

  const removeFromQueue = async (entryId) => {
    if (!confirm('Remove this customer from the queue?')) return
    try {
      await fetch(`/api/queue/${entryId}`, { method: 'DELETE' })
      setQueue(queue.filter((e) => e.id !== entryId))
    } catch (err) {
      console.error('Failed to remove:', err)
    }
  }

  const toggleLaneMaintenance = async (lane) => {
    const newStatus = lane.status === 'maintenance' ? 'available' : 'maintenance'
    try {
      await fetch(`/api/lanes/${lane.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
    } catch (err) {
      console.error('Failed to update lane:', err)
    }
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

  const addLane = async () => {
    const name = prompt('Enter lane name:')
    if (!name) return
    try {
      await fetch('/api/lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
    } catch (err) {
      console.error('Failed to add lane:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const availableLanes = lanes.filter((l) => l.status === 'available')

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-white">Q</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{settings?.rangeName || 'QDog'}</h1>
              <p className="text-sm text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              + Add Customer
            </a>
            <span className="text-sm text-gray-600">
              {queue.length} in queue
            </span>
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

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lanes Panel */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Lanes</h2>
              <button
                onClick={addLane}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Lane
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {lanes.map((lane) => (
                <div
                  key={lane.id}
                  className={`rounded-lg p-4 border-2 ${
                    lane.status === 'occupied'
                      ? 'border-red-300 bg-red-50'
                      : lane.status === 'maintenance'
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-green-300 bg-green-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">{lane.name}</div>
                  <div className={`text-sm ${
                    lane.status === 'occupied' ? 'text-red-600' :
                    lane.status === 'maintenance' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {lane.status === 'occupied' && lane.currentCustomer
                      ? lane.currentCustomer.customerName
                      : lane.status.charAt(0).toUpperCase() + lane.status.slice(1)}
                  </div>

                  <div className="mt-3 flex gap-2">
                    {lane.status === 'occupied' && (
                      <button
                        onClick={() => releaseLane(lane.id)}
                        className="text-xs bg-white px-2 py-1 rounded border hover:bg-gray-50"
                      >
                        Release
                      </button>
                    )}
                    {lane.status === 'available' && queue.length > 0 && (
                      <button
                        onClick={() => assignLane(lane.id, queue[0].id)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Assign Next
                      </button>
                    )}
                    <button
                      onClick={() => toggleLaneMaintenance(lane)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {lane.status === 'maintenance' ? 'Enable' : 'Maint.'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-400"></span> Available ({lanes.filter(l => l.status === 'available').length})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-400"></span> Occupied ({lanes.filter(l => l.status === 'occupied').length})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-400"></span> Maintenance ({lanes.filter(l => l.status === 'maintenance').length})
              </span>
            </div>
          </div>

          {/* Queue Panel */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Queue</h2>
              <span className="text-sm text-gray-500">{queue.length} waiting</span>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No one in queue</p>
                <p className="text-sm mt-1">Customers can join at the check-in page</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {entry.position}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">{entry.customerName}</div>
                        <div className="text-sm text-gray-500">
                          {entry.partySize} {entry.partySize === 1 ? 'person' : 'people'} • {new Date(entry.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {index === 0 && availableLanes.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) assignLane(parseInt(e.target.value), entry.id)
                          }}
                          className="text-sm border rounded px-2 py-1"
                          defaultValue=""
                        >
                          <option value="">Assign to...</option>
                          {availableLanes.map((lane) => (
                            <option key={lane.id} value={lane.id}>{lane.name}</option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={() => markNoShow(entry.id)}
                        className="text-sm text-yellow-600 hover:text-yellow-700"
                        title="Mark as no-show"
                      >
                        No-show
                      </button>
                      <button
                        onClick={() => removeFromQueue(entry.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                        title="Remove from queue"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                  Range Name
                </label>
                <input
                  type="text"
                  value={settings.rangeName}
                  onChange={(e) => setSettings({ ...settings, rangeName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Session (minutes)
                </label>
                <input
                  type="number"
                  value={settings.defaultSessionMins}
                  onChange={(e) => setSettings({ ...settings, defaultSessionMins: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No-show Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={settings.notifyTimeoutMins}
                  onChange={(e) => setSettings({ ...settings, notifyTimeoutMins: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="emailNotifications" className="text-sm text-gray-700">
                  Enable email notifications
                </label>
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
