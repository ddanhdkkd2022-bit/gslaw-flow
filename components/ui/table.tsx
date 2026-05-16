import * as React from "react"

export function Table({ className, style, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div style={{ overflowX: "auto", width: "100%" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", ...style }}
        className={className}
        {...props}
      />
    </div>
  )
}

export function TableHeader({ ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />
}

export function TableBody({ ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />
}

export function TableRow({ className, style, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      style={{ borderBottom: "1px solid #f1f5f9", transition: "background-color .15s", ...style }}
      className={className}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f8fafc" }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "" }}
      {...props}
    />
  )
}

export function TableHead({ className, style, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      style={{
        padding: "12px 16px",
        textAlign: "left",
        fontSize: "12px",
        fontWeight: 600,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: ".05em",
        borderBottom: "1px solid #e2e8f0",
        ...style,
      }}
      className={className}
      {...props}
    />
  )
}

export function TableCell({ className, style, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      style={{ padding: "14px 16px", color: "#334155", verticalAlign: "middle", ...style }}
      className={className}
      {...props}
    />
  )
}
