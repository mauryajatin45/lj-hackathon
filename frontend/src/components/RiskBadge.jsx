import { formatRiskScore, getRiskLevel } from '../utils/format.js'
import { ShieldCheckIcon, ShieldExclamationIcon, ExclamationTriangleIcon } from 'lucide-react'

export default function RiskBadge({ score }) {
  if (score === undefined || score === null) {
    return <span className="text-gray-400">—</span>
  }

  const level = getRiskLevel(score)
  const percentage = formatRiskScore(score)

  const getConfig = () => {
    switch (level) {
      case 'low':
        return {
          className: 'badge-low',
          icon: ShieldCheckIcon,
          text: `LOW ${percentage}`
        }
      case 'medium':
        return {
          className: 'badge-medium',
          icon: ShieldExclamationIcon,
          text: `MEDIUM ${percentage}`
        }
      case 'high':
        return {
          className: 'badge-high',
          icon: ExclamationTriangleIcon,
          text: `HIGH ${percentage}`
        }
      default:
        return {
          className: 'badge bg-gray-100 text-gray-800',
          icon: ShieldCheckIcon,
          text: percentage
        }
    }
  }

  const { className, icon: Icon, text } = getConfig()

  return (
    <span className={`badge ${className} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  )
}