import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border-2 border-white/10 bg-transparent text-foreground hover:bg-white/5 hover:border-white/20",
        secondary: "bg-secondary text-secondary-foreground shadow-sm shadow-secondary/20 hover:bg-secondary/80",
        ghost: "hover:bg-white/10 hover:text-white text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 shadow-lg",
        amber: "bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/25 hover:bg-amber-400 font-bold",
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-14 rounded-2xl px-8 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
