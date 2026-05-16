import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ style, className, ...props }: InputProps) {
  const [focused, setFocused] = React.useState(false)
  return (
    <input
      style={{
        display: "block",
        width: "100%",
        padding: "8px 12px",
        fontSize: "14px",
        lineHeight: "1.5",
        color: "#1e293b",
        backgroundColor: "#fff",
        border: `1.5px solid ${focused ? "#2563eb" : "#e2e8f0"}`,
        borderRadius: "8px",
        outline: "none",
        transition: "border-color .15s",
        boxSizing: "border-box",
        ...style,
      }}
      className={className}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
      {...props}
    />
  )
}
