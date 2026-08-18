"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-150 outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-none font-semibold",
        primary:
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-none font-semibold",
        gradient:
          "bg-gradient-to-r from-[#0073B5] to-[#0099EE] text-white hover:opacity-95 font-semibold",
        glass:
          "bg-[var(--bg-glass)] backdrop-blur-md border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]",
        ai:
          "bg-gradient-to-r from-[#0099EE] to-[#81BDFF] text-[#001223] font-semibold hover:opacity-95",
        outline:
          "border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]",
        secondary:
          "bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
        ghost:
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
        danger:
          "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 font-medium",
        link:
          "text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        default: "h-9 px-3.5 py-1.5 text-sm rounded-lg",
        xs: "h-7 px-2.5 text-xs rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-9 px-3.5 py-1.5 text-sm rounded-lg",
        lg: "h-10 px-4 text-sm rounded-lg font-semibold [&_svg:not([class*='size-'])]:size-4.5",
        xl: "h-11 px-5 text-base rounded-lg font-semibold [&_svg:not([class*='size-'])]:size-5",
        icon: "size-9 rounded-lg p-0",
        "icon-xs": "size-7 rounded-lg p-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-lg p-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-10 rounded-lg p-0 [&_svg:not([class*='size-'])]:size-5",
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


