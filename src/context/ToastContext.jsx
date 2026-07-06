import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null)
  const timer = useRef(null)

  const showToast = useCallback((msg) => {
    if (!msg) return
    setMessage(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 3500)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message && <div className="toast">{message}</div>}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
