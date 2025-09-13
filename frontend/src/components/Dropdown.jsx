import { useState, useRef, useEffect } from 'react'

export default function Dropdown({ 
  trigger, 
  children, 
  isOpen, 
  onToggle 
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const dropdownRef = useRef()

  const isControlled = isOpen !== undefined
  const open = isControlled ? isOpen : internalIsOpen
  const toggle = isControlled ? onToggle : () => setInternalIsOpen(!internalIsOpen)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (isControlled) {
          onToggle(false)
        } else {
          setInternalIsOpen(false)
        }
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, isControlled, onToggle])

  return (
    <div className="dropdown" ref={dropdownRef}>
      <div onClick={() => toggle(!open)}>
        {trigger}
      </div>
      {open && (
        <div className="dropdown-menu">
          {children}
        </div>
      )}
    </div>
  )
}