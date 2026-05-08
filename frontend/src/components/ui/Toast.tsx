import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
}

let addToastGlobal: ((type: ToastType, message: string) => void) | null = null

export function toast(type: ToastType, message: string) {
  if (addToastGlobal) {
    addToastGlobal(type, message)
  }
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle
}

const colors = {
  success: 'border-success/30 bg-success/5',
  error: 'border-danger/30 bg-danger/5',
  info: 'border-primary/30 bg-primary/5',
  warning: 'border-warning/30 bg-warning/5'
}

const iconColors = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
  warning: 'text-warning'
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToastGlobal = (type: ToastType, message: string) => {
      const id = Date.now().toString()
      setToasts(prev => [...prev, { id, type, message }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 4000)
    }
    return () => { addToastGlobal = null }
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map(t => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg shadow-black/20 animate-slide-in ${colors[t.type]}`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconColors[t.type]}`} />
            <span className="text-sm text-text-primary">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 hover:bg-surface-2 rounded transition-colors"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
