import * as React from "react"

export function Card({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        backgroundColor: "#fff",
        boxShadow: "0 1px 3px 0 rgba(0,0,0,.07)",
        ...style,
      }}
      className={className}
      {...props}
    />
  )
}

export function CardHeader({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{ padding: "20px 24px 0 24px", display: "flex", flexDirection: "column", gap: "6px", ...style }}
      className={className}
      {...props}
    />
  )
}

export function CardTitle({ className, style, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      style={{ fontSize: "14px", fontWeight: 600, lineHeight: "1", letterSpacing: "-.01em", color: "#64748b", ...style }}
      className={className}
      {...props}
    />
  )
}

export function CardContent({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{ padding: "12px 24px 20px 24px", ...style }}
      className={className}
      {...props}
    />
  )
}
