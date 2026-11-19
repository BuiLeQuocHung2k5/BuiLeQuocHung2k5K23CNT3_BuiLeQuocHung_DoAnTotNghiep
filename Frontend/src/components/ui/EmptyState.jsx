export default function EmptyState({ icon, title, description, action, className = '', ...props }) {
  return (
    <div {...props} className={`ui-empty ${className}`}>
      {icon && <div className="ui-empty-icon" aria-hidden="true">{icon}</div>}
      <p className="ui-empty-title">{title}</p>
      {description && <p className="ui-empty-description">{description}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  )
}
