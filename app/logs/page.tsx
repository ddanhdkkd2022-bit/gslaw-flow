"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Clock } from "lucide-react";

export default function LogsPage() {
  const { isAdmin, profile } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch if profile is loaded
    if (!profile) return;
    
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (data) setLogs(data);
      if (error) {
        if (error.code === "42P01") console.log("Table activity_logs not found");
      }
      setLoading(false);
    };
    fetchLogs();
  }, [isAdmin, profile, router]);

  if (!profile || (!isAdmin && !loading)) return <div/>;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <Header title="Nhật ký Hệ thống" showActions={true} />
      <main style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px" }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>Lịch sử Hoạt động (Admin)</h1>
          {loading ? (
            <div style={{ color: "#64748b" }}>Đang tải...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {logs.length === 0 ? <div style={{ color: "#64748b" }}>Chưa có hoạt động nào. (Hoặc bạn chưa chạy lệnh SQL)</div> : logs.map(log => (
                <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, paddingBottom: 12, borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e0e7ff", color: "#3730a3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                    {log.user_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>{log.user_name}</span> {log.action} <span style={{ fontWeight: 600 }}>{log.details}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} /> {new Date(log.created_at).toLocaleString("vi-VN")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
