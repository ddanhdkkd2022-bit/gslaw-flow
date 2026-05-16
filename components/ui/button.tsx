import * as React from "react"

type ButtonVariant = "default" | "outline" | "ghost" | "destructive"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantMap: Record<ButtonVariant, React.CSSProperties> = {
  default: { backgroundColor: "#2563eb", color: "#fff", border: "none" },
  outline: { backgroundColor: "transparent", color: "#2563eb", border: "1.5px solid #2563eb" },
  ghost: { backgroundColor: "transparent", color: "#475569", border: "none" },
  destructive: { backgroundColor: "#dc2626", color: "#fff", border: "none" },
}

export function Button({ variant = "default", style, className, children, disabled, ...props }: ButtonProps) {
  const [hovered, setHovered] = React.useState(false)

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "8px 18px",
    fontSize: "14px",
    fontWeight: 600,
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    transition: "opacity .15s, filter .15s",
    filter: hovered && !disabled ? "brightness(0.88)" : "none",
    whiteSpace: "nowrap",
    ...variantMap[variant],
    ...style,
  }

  return (
    <button
      style={baseStyle}
      className={className}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
      {children}
    </button>
  )
}
