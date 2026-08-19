"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm font-medium border border-white/10 dark:border-black/20",
        primary:
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm font-medium border border-white/10 dark:border-black/20",
        gradient:
          "bg-[var(--accent)] text-white hover:opacity-95 font-medium shadow-sm",
        glass:
          "bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] shadow-sm",
        ai:
          "bg-[var(--accent)] text-white font-medium hover:opacity-95 shadow-sm",
        outline:
          "border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]",
        secondary:
          "bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] shadow-sm",
        ghost:
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
        danger:
          "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 font-medium",
        link:
          "text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        default: "h-9 px-3.5 py-1.5 text-sm rounded-xl",
        xs: "h-7 px-2.5 text-xs rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-9 px-3.5 py-1.5 text-sm rounded-xl",
        lg: "h-10 px-4 text-sm rounded-xl font-semibold [&_svg:not([class*='size-'])]:size-4.5",
        xl: "h-11 px-5 text-base rounded-2xl font-semibold [&_svg:not([class*='size-'])]:size-5",
        icon: "size-9 rounded-xl p-0",
        "icon-xs": "size-7 rounded-lg p-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-xl p-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-10 rounded-2xl p-0 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)


function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof ButtonPrimitive> & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }


