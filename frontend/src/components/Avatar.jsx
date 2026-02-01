import { useState } from 'react'

/**
 * Avatar component with placeholder fallback
 * Falls back to placeholder image if the avatar fails to load
 */
export default function Avatar({ avatar, handle, className = '' }) {
  const [error, setError] = useState(false)

  // Determine if female based on avatar path
  const isFemale = avatar?.startsWith('female/')

  // Get the appropriate placeholder
  const placeholder = isFemale ? '/avatars/female/placeholder.png' : '/avatars/placeholder.png'

  // Get the avatar URL
  const avatarUrl = error ? placeholder : `/avatars/${avatar}.png`

  return (
    <img
      src={avatarUrl}
      alt={handle || 'Avatar'}
      className={className}
      onError={() => setError(true)}
    />
  )
}
