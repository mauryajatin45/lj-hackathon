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
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {header}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  )
}