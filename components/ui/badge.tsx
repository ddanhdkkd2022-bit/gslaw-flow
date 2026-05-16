import * as React from "react"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "background-color:#1d4ed8;color:#fff;",
  secondary:
    "background-color:#f1f5f9;color:#475569;",
  destructive:
    "background-color:#dc2626;color:#fff;",
  outline:
    "background-color:transparent;color:#1e293b;border:1px solid #e2e8f0;",
}

export function Badge({ variant = "default", className, style, ...props }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "9999px",
        padding: "2px 10px",
        fontSize: "12px",
        fontWeight: 600,
        lineHeight: "20px",
        whiteSpace: "nowrap",
        ...Object.fromEntries(
          variantStyles[variant]
            .split(";")
            .filter(Boolean)
            .map((s) => {
              const [k, v] = s.split(":").map((x) => x.trim())
              const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
              return [camel, v]
            })
        ),
        ...style,
      }}
      className={className}
      {...props}
    />
  )
}
