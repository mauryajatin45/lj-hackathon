export default function Card({ 
  children, 
  className = '', 
  header, 
  title,
  ...props 
}) {
  return (
    <div className={`card ${className}`} {...props}>
      {(header || title) && (
        <div className="card-header">
          {title && <h3>{title}</h3>}
          {header}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  )
}