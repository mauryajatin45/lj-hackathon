import { SignalIcon, ExclamationTriangleIcon } from 'lucide-react'

export default function SSEStatusPill({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return { 
          className: 'badge-success', 
          text: 'Connected',
          icon: SignalIcon
        }
      case 'reconnecting':
        return { 
          className: 'badge-warning', 
          text: 'Reconnecting...',
          icon: ExclamationTriangleIcon
        }
      case 'error':
      case 'disconnected':
        return { 
          className: 'badge-danger', 
          text: 'Disconnected',
          icon: ExclamationTriangleIcon
        }
      default:
        return { 
          className: 'badge bg-gray-100 text-gray-800', 
          text: 'Unknown',
          icon: ExclamationTriangleIcon
        }
    }
  }

  const { className, text, icon: Icon } = getStatusConfig()

  return (
    <span className={`badge ${className} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  )
}