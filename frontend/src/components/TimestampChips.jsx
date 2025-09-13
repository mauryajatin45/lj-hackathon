import { formatTimestamp } from '../utils/format.js'

export default function TimestampChips({ timestamps = [] }) {
  if (!timestamps || timestamps.length === 0) {
    return <span className="text-muted">—</span>
  }

  return (
    <div className="chips-container">
      {timestamps.map((timestamp, index) => (
        <span key={index} className="chip">
          {formatTimestamp(timestamp.start)}–{formatTimestamp(timestamp.end)}
          {timestamp.label && ` (${timestamp.label})`}
        </span>
      ))}
    </div>
  )
}