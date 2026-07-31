function AnalyticsCard({
  icon,
  title,
  value,
  subtitle,
  color,
}) {
  return (
    <div
      className="analytics-card"
      style={{ borderTop: `6px solid ${color}` }}
    >
      <div
        className="icon-circle"
        style={{ background: color }}
      >
        {icon}
      </div>

      <div className="card-title">{title}</div>

      <div className="card-number">{value}</div>

      <div className="card-footer">{subtitle}</div>
    </div>
  );
}

export default AnalyticsCard;