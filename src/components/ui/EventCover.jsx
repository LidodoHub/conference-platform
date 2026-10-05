import { coverStyle } from '../../lib/cover'

export default function EventCover({ seed, className = '', children }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={coverStyle(seed)}>
      {children}
    </div>
  )
}
