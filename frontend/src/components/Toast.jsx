import { useState, useEffect, Fragment } from 'react'
import { Transition } from '@headlessui/react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  XMarkIcon 
} from 'lucide-react'

let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'success', duration = 5000) => {
    const id = ++toastId
    const toast = { id, message, type, duration }
    
    setToasts(prev => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const success = (message, duration) => addToast(message, 'success', duration)
  const error = (message, duration) => addToast(message, 'error', duration)
  const warning = (message, duration) => addToast(message, 'warning', duration)

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning
  }
}

export default function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast 
          key={toast.id} 
          toast={toast} 
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

function Toast({ toast, onRemove }) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const getToastConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: CheckCircleIcon,
          className: 'bg-green-50 border-green-200 text-green-800',
          iconClassName: 'text-green-400'
        }
      case 'error':
        return {
          icon: XCircleIcon,
          className: 'bg-red-50 border-red-200 text-red-800',
          iconClassName: 'text-red-400'
        }
      case 'warning':
        return {
          icon: ExclamationTriangleIcon,
          className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          iconClassName: 'text-yellow-400'
        }
      default:
        return {
          icon: CheckCircleIcon,
          className: 'bg-gray-50 border-gray-200 text-gray-800',
          iconClassName: 'text-gray-400'
        }
    }
  }

  const { icon: Icon, className, iconClassName } = getToastConfig()

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto border ${className}`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Icon className={`h-5 w-5 ${iconClassName}`} />
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-medium">
                {toast.message}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={() => {
                  setShow(false)
                  setTimeout(() => onRemove(toast.id), 300)
                }}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  )
}