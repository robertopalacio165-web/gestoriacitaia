import { useState, useEffect } from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

let memoryState: Toast[] = []
let listeners: Function[] = []

export function toast(props: Omit<Toast, "id">) {
  const id = Math.random().toString(36).substr(2, 9)
  const newToast = { ...props, id }
  memoryState = [...memoryState, newToast]
  listeners.forEach(fn => fn(memoryState))
  
  setTimeout(() => {
    memoryState = memoryState.filter(t => t.id !== id)
    listeners.forEach(fn => fn(memoryState))
  }, 3000)
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryState)

  useEffect(() => {
    const listener = (state: Toast[]) => setToasts([...state])
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])

  return { toasts, toast }
}
