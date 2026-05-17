"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Briefcase, Calendar, User, Wallet, 
  MessageSquare, Plus, Clock, AlertCircle, LogOut 
} from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  customer_name: string;
  service_type: string | null;
  partner_name: string | null;
  status: string | null;
  total_amount: number | null;
  created_at: string | null;
}

interface Note {
  id: string;
  note_content: string;
  created_at: string;
}

function formatVND(n: number) { return n.toLocaleString("vi-VN") + "đ"; }
function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} - ${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info("Đã đăng xuất");
  };

  async function fetchDetails() {
    setLoading(true);
    // Lấy thông tin dự án
    const { data: projData, error: projError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (projError) {
      setError("Không tìm thấy hồ sơ hoặc có lỗi xảy ra.");
      setLoading(false);
      return;
    }
    setProject(projData);

    // Lấy danh sách ghi chú
    const { data: notesData, error: notesError } = await supabase
      .from("project_notes")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (notesError) {
      // PGRST205 or 42P01: Table does not exist
      if (notesError.code === "PGRST205" || notesError.code === "42P01") {
         setError("⚠️ LỖI: Bảng 'project_notes' chưa được tạo trên Supabase. Bạn cần chạy lệnh SQL để tạo bảng trước khi có thể lưu ghi chú.");
      } else {
         console.error(notesError);
         setError("Lỗi khi tải ghi chú: " + notesError.message);
      }
    } else {
      setNotes(notesData || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);

    const { error } = await supabase
      .from("project_notes")
      .insert([{ project_id: id, note_content: newNote.trim() }]);

    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") {
        toast.error("Lỗi bảng dữ liệu", { description: "Bảng 'project_notes' chưa tồn tại. Vui lòng chạy lệnh SQL trên Supabase." });
      } else {
        toast.error("Lỗi khi thêm ghi chú", { description: error.message });
      }
    } else {
      toast.success("Đã lưu ghi chú!");
      setNewNote("");
      // Lấy lại danh sách ghi chú để hiển thị ghi chú mới nhất
      const { data } = await supabase
        .from("project_notes")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (data) setNotes(data);
    }
    setAddingNote(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#1d4ed8", fontWeight: 600 }}>
          <div style={{ width: 24, height: 24, border: "3px solid #bfdbfe", borderTop: "3px solid #1d4ed8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          Đang tải thông tin...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ── HEADER ── */}
      <header style={{
        background: "linear-gradient(135deg, #0f2044 0%, #1e3a6e 100%)",
        padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 64,
        boxShadow: "0 2px 12px rgba(0,0,0,.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button 
            onClick={() => router.push("/")}
            style={{ 
              background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", 
              width: 36, height: 36, borderRadius: "50%", display: "flex", 
              alignItems: "center", justifyContent: "center", cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          >
            <ArrowLeft size={18} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: ".3px" }}>
            Chi tiết Hồ sơ
          </span>
        </div>

        <button
          onClick={handleLogout}
          title="Đăng xuất"
          style={{
            background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
            padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
        >
          <LogOut size={15} /> <span style={{ display: "none" }}>Đăng xuất</span>
        </button>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1fr 350px", gap: 24 }}>
        
        {/* ── CỘT TRÁI: THÔNG TIN CHÍNH ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10,
              padding: "16px", color: "#b91c1c", fontSize: 14, display: "flex", gap: 12,
            }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {project && (
            <div style={{
              background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)", overflow: "hidden"
            }}>
              <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9" }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
                  {project.customer_name}
                </h1>
                <div style={{ display: "inline-block", background: "#eff6ff", color: "#1d4ed8", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                  Trạng thái: {project.status ?? "Chưa rõ"}
                </div>
              </div>

              <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ background: "#f8fafc", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}><Briefcase size={20}/></div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Dịch vụ</div>
                    <div style={{ fontSize: 15, color: "#0f172a", fontWeight: 500, marginTop: 2 }}>{project.service_type ?? "—"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ background: "#f8fafc", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}><User size={20}/></div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Người giới thiệu</div>
                    <div style={{ fontSize: 15, color: "#0f172a", fontWeight: 500, marginTop: 2 }}>{project.partner_name ?? "—"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ background: "#f0fdf4", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#15803d" }}><Wallet size={20}/></div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Phí dịch vụ</div>
                    <div style={{ fontSize: 15, color: "#059669", fontWeight: 700, marginTop: 2 }}>{project.total_amount ? formatVND(project.total_amount) : "—"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ background: "#f8fafc", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}><Calendar size={20}/></div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Ngày tạo</div>
                    <div style={{ fontSize: 15, color: "#0f172a", fontWeight: 500, marginTop: 2 }}>{project.created_at ? formatDateTime(project.created_at) : "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── CỘT PHẢI: NHẬT KÝ ── */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", height: "calc(100vh - 128px)", position: "sticky", top: 96
        }}>
          <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
            <MessageSquare size={18} color="#1d4ed8" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Nhật ký xử lý</h2>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#f8fafc" }}>
            {notes.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 40 }}>
                Chưa có ghi chú nào.<br/>Hãy thêm nhật ký đầu tiên!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {notes.map((note) => (
                  <div key={note.id} style={{ background: "#fff", padding: "16px", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {note.note_content}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} /> {formatDateTime(note.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: "16px", borderTop: "1px solid #f1f5f9", background: "#fff" }}>
            <textarea 
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Nhập nội dung công việc..."
              style={{
                width: "100%", height: 80, padding: "12px", fontSize: 13,
                border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none",
                resize: "none", marginBottom: 12, fontFamily: "inherit"
              }}
              onFocus={e => e.target.style.borderColor = "#1d4ed8"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !newNote.trim()}
              style={{
                width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700,
                background: (addingNote || !newNote.trim()) ? "#93c5fd" : "#1d4ed8",
                color: "#fff", border: "none", borderRadius: 8, cursor: (addingNote || !newNote.trim()) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "background .15s"
              }}
            >
              <Plus size={16} /> {addingNote ? "Đang lưu..." : "Thêm ghi chú"}
            </button>
          </div>
        </div>

      </main>
      
      {/* Mobile responsive cho CSS Grid */}
      <style>{`
        @media (max-width: 768px) {
          main { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
