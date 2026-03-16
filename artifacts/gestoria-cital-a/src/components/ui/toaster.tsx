// Simplified toaster for standard requirements
import { ToastProvider, ToastViewport } from "./toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <div key={id} className="glass-panel p-4 rounded-xl mb-2 flex flex-col gap-1 border-primary/20 shadow-lg shadow-primary/10">
            {title && <div className="font-semibold text-white">{title}</div>}
            {description && <div className="text-sm text-muted-foreground">{description}</div>}
          </div>
        )
      })}
      <ToastViewport className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastProvider>
  )
}
