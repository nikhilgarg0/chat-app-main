"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm shadow-[var(--accent)]/20 font-semibold",
        primary:
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm shadow-[var(--accent)]/20 font-semibold",
        gradient:
          "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:opacity-95 font-semibold",
        glass:
          "bg-[var(--bg-glass)] backdrop-blur-md border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--accent)]/40 shadow-sm",
        ai:
          "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20 hover:shadow-purple-500/30 hover:opacity-95 font-semibold",
        outline:
          "border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface)] hover:border-[var(--text-secondary)]/30",
        secondary:
          "bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
        ghost:
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]",
        danger:
          "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 font-medium",
        link:
          "text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        default: "h-9 px-4 py-2 text-sm",
        xs: "h-7 px-2.5 text-xs rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-9 px-4 py-2 text-sm",
        lg: "h-11 px-5 text-base rounded-xl font-semibold [&_svg:not([class*='size-'])]:size-5",
        xl: "h-12 px-6 text-base rounded-2xl font-bold [&_svg:not([class*='size-'])]:size-5",
        icon: "size-9 rounded-xl p-0",
        "icon-xs": "size-7 rounded-lg p-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-lg p-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-11 rounded-2xl p-0 [&_svg:not([class*='size-'])]:size-5",
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

