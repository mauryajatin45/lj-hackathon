export default function SSEStatusPill({ status }) {
  const getStatusProps = () => {
    switch (status) {
      case 'connected':
        return { className: 'badge badge-connected', text: 'Connected' }
      case 'reconnecting':
        return { className: 'badge badge-warning', text: 'Reconnecting...' }
      case 'error':
      case 'disconnected':
        return { className: 'badge badge-error', text: 'Disconnected' }
      default:
        return { className: 'badge', text: 'Unknown' }
    }
  }

  const { className, text } = getStatusProps()

  return <span className={className}>{text}</span>
}