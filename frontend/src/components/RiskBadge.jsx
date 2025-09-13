import { formatRiskScore, getRiskLevel } from '../utils/format.js'

export default function RiskBadge({ score }) {
  if (score === undefined || score === null) {
    return <span className="text-muted">—</span>
  }

  const level = getRiskLevel(score)
  const percentage = formatRiskScore(score)

  return (
    <span className={`badge badge-${level}`}>
      {level.toUpperCase()} {percentage}
    </span>
  )
}