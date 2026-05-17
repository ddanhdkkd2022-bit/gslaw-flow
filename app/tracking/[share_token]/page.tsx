"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Scale, Clock, Briefcase, Calendar, CheckCircle2 } from "lucide-react";

interface Project {
  id: string;
  customer_name: string;
  service_type: string | null;
  status: string | null;
  created_at: string | null;
}

interface Note {
  id: string;
  note_content: string;
  created_at: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} - ${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

export default function TrackingPage({ params }: { params: Promise<{ share_token: string }> }) {
  const unwrappedParams = use(params);
  const shareToken = unwrappedParams.share_token;

  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTracking() {
      if (!shareToken) return;

      // 1. Fetch project by share_token
      const { data: projData, error: projError } = await supabase
        .from("projects")
        .select("id, customer_name, service_type, status, created_at")
        .eq("share_token", shareToken)
        .single();

      if (projError || !projData) {
        setError("Không tìm thấy hồ sơ. Đường link có thể không hợp lệ hoặc đã hết hạn.");
        setLoading(false);
        return;
      }
      setProject(projData);

      // 2. Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from("project_notes")
        .select("id, note_content, created_at")
        .eq("project_id", projData.id)
        .order("created_at", { ascending: false });

      if (!notesError && notesData) {
        setNotes(notesData);
      }

      setLoading(false);
    }

    fetchTracking();
  }, [shareToken]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: "4px solid #e2e8f0", borderTop: "4px solid #1e3a8a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <div style={{ color: "#475569", fontWeight: 600 }}>Đang tải thông tin hồ sơ...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ background: "#fff", padding: 40, borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", textAlign: "center", maxWidth: 400 }}>
          <div style={{ background: "#fef2f2", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Scale size={32} color="#dc2626" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Lỗi truy cập</h1>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{error}</p>
        </div>
      </div>
    );
  }

  const isCompleted = project.status === "Hoàn thành";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* HEADER */}
      <header style={{
        background: "#fff", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,.05)", position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Scale size={20} color="#fff" />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#1e3a8a", letterSpacing: ".5px" }}>GSLaw Tracking</span>
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>CỔNG THEO DÕI HỒ SƠ</span>
        </div>
      </header>

      <main style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* THÔNG TIN HỒ SƠ */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)", overflow: "hidden" }}>
          <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right, #ffffff, #f8fafc)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Thông tin Khách hàng</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 16px 0" }}>{project.customer_name}</h1>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: isCompleted ? "#f0fdf4" : "#eff6ff", color: isCompleted ? "#15803d" : "#1d4ed8", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: `1px solid ${isCompleted ? "#bbf7d0" : "#bfdbfe"}` }}>
                {isCompleted ? <CheckCircle2 size={16} /> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", animation: "pulse 2s infinite" }}/>}
                {project.status ?? "Đang xử lý"}
              </div>
            </div>
            <style>{`@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(1.5); } 100% { opacity: 1; transform: scale(1); } }`}</style>
          </div>

          <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ background: "#f8fafc", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}><Briefcase size={20}/></div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Dịch vụ</div>
                <div style={{ fontSize: 15, color: "#0f172a", fontWeight: 600, marginTop: 4 }}>{project.service_type ?? "—"}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ background: "#f8fafc", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}><Calendar size={20}/></div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Ngày tiếp nhận</div>
                <div style={{ fontSize: 15, color: "#0f172a", fontWeight: 600, marginTop: 4 }}>{project.created_at ? formatDateTime(project.created_at).split(" - ")[1] : "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* NHẬT KÝ */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 16px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            Tiến trình xử lý
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {notes.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #cbd5e1", padding: 40, textAlign: "center", color: "#64748b", fontSize: 14 }}>
                Chưa có cập nhật nào cho hồ sơ này.
              </div>
            ) : (
              notes.map((note, idx) => (
                <div key={note.id} style={{ display: "flex", gap: 16 }}>
                  {/* Timeline line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: idx === 0 ? "#3b82f6" : "#cbd5e1", border: "2px solid #f8fafc", boxShadow: "0 0 0 2px " + (idx === 0 ? "#bfdbfe" : "transparent"), zIndex: 1 }} />
                    {idx < notes.length - 1 && <div style={{ width: 2, background: "#e2e8f0", flex: 1, margin: "4px 0" }} />}
                  </div>
                  
                  {/* Card */}
                  <div style={{ background: "#fff", padding: "16px 20px", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", flex: 1, marginBottom: idx < notes.length - 1 ? 0 : 20 }}>
                    <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontWeight: 500 }}>
                      <Clock size={14} /> {formatDateTime(note.created_at)}
                    </div>
                    <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.6, whiteSpace: "pre-wrap", fontWeight: 500 }}>
                      {note.note_content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#94a3b8" }}>
          Thông tin được cung cấp bảo mật bởi hệ thống GSLaw.
        </div>

      </main>
    </div>
  );
}
