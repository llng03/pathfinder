export default function ProgressBar({ done, total, showLabel = true }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="progress-track">
        <div className="progress-beam" style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <div className="progress-label">
          <span>{done} von {total} erledigt</span>
          <span>{pct}%</span>
        </div>
      )}
    </div>
  )
}
