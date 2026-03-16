import * as React from "react"
import { cn } from "@/lib/utils"

// Dummy implementation to satisfy imports without complex radix-ui dependencies
export const ToastProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ToastViewport = ({ className }: { className?: string }) => <div className={className} />
