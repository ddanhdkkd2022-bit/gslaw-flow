"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Briefcase, Calendar, User, Wallet, 
  MessageSquare, Plus, Clock, AlertCircle, LogOut,
  FileText, Download, Trash2, UploadCloud, Loader2,
  CheckSquare, Check, Link as LinkIcon, Printer
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
  share_token: string | null;
}

interface Note {
  id: string;
  note_content: string;
  created_at: string;
}

interface StorageFile {
  name: string;
  id: string | null;
  updated_at: string | null;
  metadata: any;
}

interface Task {
  id: string;
  task_name: string;
  is_completed: boolean;
}

function formatVND(n: number) { return n.toLocaleString("vi-VN") + "đ"; }
function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} - ${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFetchError, setTaskFetchError] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info("Đã đăng xuất");
  };

  async function fetchDetails() {
    setLoading(true);
    // 1. Dự án
    const { data: projData, error: projError } = await supabase
      .from("projects").select("*").eq("id", id).single();

    if (projError) {
      setError("Không tìm thấy hồ sơ hoặc có lỗi xảy ra.");
      setLoading(false); return;
    }
    setProject(projData);

    // 2. Ghi chú
    const { data: notesData, error: notesError } = await supabase
      .from("project_notes").select("*").eq("project_id", id).order("created_at", { ascending: false });

    if (notesError) {
      if (notesError.code === "PGRST205" || notesError.code === "42P01") {
         setError("⚠️ LỖI: Bảng 'project_notes' chưa được tạo.");
      } else setError("Lỗi khi tải ghi chú: " + notesError.message);
    } else setNotes(notesData || []);

    // 3. Tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: true });
    
    if (tasksError) {
      setTaskFetchError(tasksError.message || JSON.stringify(tasksError));
    } else {
      setTasks(tasksData || []);
      setTaskFetchError(null);
    }

    // 4. Files
    fetchFiles();

    setLoading(false);
  }

  async function fetchFiles() {
    const { data, error } = await supabase.storage.from('project-documents').list(id);
    if (error) {
      if (error.message.includes("Bucket not found")) toast.warning("Bucket 'project-documents' chưa được tạo.");
    } else setFiles((data || []).filter(f => f.name !== ".emptyFolderPlaceholder"));
  }

  useEffect(() => { if (id) fetchDetails(); }, [id]);

  /* ─── Notes ─── */
  async function handleAddNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    const { error } = await supabase.from("project_notes").insert([{ project_id: id, note_content: newNote.trim() }]);
    if (error) toast.error("Lỗi thêm ghi chú", { description: error.message });
    else {
      toast.success("Đã lưu ghi chú!"); setNewNote("");
      const { data } = await supabase.from("project_notes").select("*").eq("project_id", id).order("created_at", { ascending: false });
      if (data) setNotes(data);
    }
    setAddingNote(false);
  }

  /* ─── Files ─── */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    const { error } = await supabase.storage.from('project-documents').upload(`${id}/${file.name}`, file, { upsert: true });
    if (error) toast.error("Lỗi tải lên", { description: error.message });
    else { toast.success("Tải file lên thành công!"); fetchFiles(); }
    setUploading(false); e.target.value = '';
  }

  async function handleDownload(fileName: string) {
    const { data, error } = await supabase.storage.from('project-documents').createSignedUrl(`${id}/${fileName}`, 60);
    if (error) toast.error("Lỗi tải file", { description: error.message });
    else if (data?.signedUrl) {
      const link = document.createElement('a');
      link.href = data.signedUrl; link.target = "_blank"; link.download = fileName;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
  }

  async function handleDeleteFile(fileName: string) {
    if (!confirm(`Xóa file "${fileName}"?`)) return;
    const { error } = await supabase.storage.from('project-documents').remove([`${id}/${fileName}`]);
    if (error) toast.error("Lỗi khi xóa file", { description: error.message });
    else { toast.success("Đã xóa file!"); fetchFiles(); }
  }

  /* ─── Tasks ─── */
  async function handleAddTask() {
    if (!newTask.trim()) return;
    setAddingTask(true);
    const { error } = await supabase.from("tasks").insert([{ project_id: id, task_name: newTask.trim() }]);
    if (error) {
      if (error.code === "42P01") toast.error("Lỗi", { description: "Bảng 'tasks' chưa được tạo. Hãy chạy lệnh SQL." });
      else toast.error("Lỗi thêm công việc", { description: error.message });
    } else {
      setNewTask("");
      const { data } = await supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: true });
      if (data) setTasks(data);
    }
    setAddingTask(false);
  }

  async function toggleTask(taskId: string, current: boolean) {
    const { error } = await supabase.from("tasks").update({ is_completed: !current }).eq("id", taskId);
    if (error) toast.error("Lỗi cập nhật", { description: error.message });
    else setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: !current } : t));
  }

  async function deleteTask(taskId: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) toast.error("Lỗi khi xóa", { description: error.message });
    else setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  /* ─── Client Portal Link ─── */
  async function handleGenerateLink() {
    let token = project?.share_token;
    if (!token) {
      token = crypto.randomUUID();
      const { error } = await supabase.from("projects").update({ share_token: token }).eq("id", id);
      if (error) { toast.error("Lỗi", { description: "Chưa thêm cột share_token. Hãy chạy SQL." }); return; }
      setProject(prev => prev ? { ...prev, share_token: token as string } : null);
    }
    const link = `${window.location.origin}/tracking/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Đã copy Link theo dõi Khách hàng!");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#1d4ed8", fontWeight: 600 }}>
          <Loader2 className="animate-spin" size={24} /> Đang tải thông tin...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.is_completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="print-wrapper" style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ── HEADER ── */}
      <header className="hide-on-print" style={{
        background: "linear-gradient(135deg, #0f2044 0%, #1e3a6e 100%)", padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, boxShadow: "0 2px 12px rgba(0,0,0,.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/")} style={btnNavStyle}><ArrowLeft size={18} /></button>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: ".3px" }}>Chi tiết Hồ sơ</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={handleGenerateLink} title="Chia sẻ khách hàng" style={{ ...btnNavStyle, background: "#3b82f6" }}>
            <LinkIcon size={15} /> Tạo Link Tracking
          </button>
          <button onClick={() => window.print()} title="In PDF" style={btnNavStyle}>
            <Printer size={15} /> In Báo Cáo
          </button>
          <button onClick={handleLogout} title="Đăng xuất" style={btnNavStyle}><LogOut size={15} /></button>
        </div>
      </header>

      {/* PRINT HEADER */}
      <div className="show-on-print" style={{ padding: "40px 40px 0 40px", display: "none", textAlign: "center" }}>
        <h1 style={{ fontSize: 28, color: "#0f2044", marginBottom: 8 }}>GSLaw Flow</h1>
        <div style={{ fontSize: 18, color: "#64748b", fontWeight: 600 }}>BÁO CÁO TIẾN ĐỘ HỒ SƠ</div>
      </div>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }} className="print-main">
        
        {/* ── CỘT TRÁI: THÔNG TIN & FILES & TASKS ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="print-left">
          {error && <div className="hide-on-print" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "16px", color: "#b91c1c", fontSize: 14, display: "flex", gap: 12 }}><AlertCircle size={20} /> <div>{error}</div></div>}

          {/* PROJECT DETAILS */}
          {project && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)", overflow: "hidden" }}>
              <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9" }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>{project.customer_name}</h1>
                <div style={{ display: "inline-block", background: "#eff6ff", color: "#1d4ed8", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>Trạng thái: {project.status ?? "Chưa rõ"}</div>
              </div>
              <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <InfoItem icon={Briefcase} label="Dịch vụ" value={project.service_type} />
                <InfoItem icon={User} label="Người giới thiệu" value={project.partner_name} />
                <InfoItem icon={Wallet} label="Phí dịch vụ" value={project.total_amount ? formatVND(project.total_amount) : null} isMoney />
                <InfoItem icon={Calendar} label="Ngày tạo" value={project.created_at ? formatDateTime(project.created_at) : null} />
              </div>
            </div>
          )}

          {/* SUB-TASKS CHECKLIST */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckSquare size={18} color="#1d4ed8" />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Checklist Công việc</h2>
              </div>
              {!taskFetchError && tasks.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", padding: "4px 10px", borderRadius: 12 }}>{progressPercent}% Hoàn thành</div>}
            </div>
            
            {taskFetchError ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                <AlertCircle size={24} color="#dc2626" style={{ margin: "0 auto 10px" }} />
                Chưa thể tải danh sách công việc.<br/>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Lỗi: {taskFetchError}</span>
              </div>
            ) : (
              <>
                {tasks.length > 0 && (
                  <div style={{ padding: "0 20px" }}>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, marginTop: 16, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: progressPercent === 100 ? "#10b981" : "#3b82f6", width: `${progressPercent}%`, transition: "width 0.3s ease" }} />
                    </div>
                  </div>
                )}

                <div style={{ padding: "20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {tasks.map(task => (
                      <div key={task.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: task.is_completed ? "#f8fafc" : "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }}>
                          <div onClick={() => toggleTask(task.id, task.is_completed)} style={{ width: 20, height: 20, borderRadius: 6, border: task.is_completed ? "none" : "2px solid #cbd5e1", background: task.is_completed ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                            {task.is_completed && <Check size={14} color="#fff" strokeWidth={3} />}
                          </div>
                          <span style={{ fontSize: 14, color: task.is_completed ? "#94a3b8" : "#0f172a", textDecoration: task.is_completed ? "line-through" : "none", fontWeight: 500, transition: "all 0.2s" }}>{task.task_name}</span>
                        </label>
                        <button className="hide-on-print" onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="hide-on-print" style={{ display: "flex", gap: 8 }}>
                    <input type="text" value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAddTask()} placeholder="Thêm công việc mới..." style={{ flex: 1, padding: "8px 12px", fontSize: 13, border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none", transition: "border-color .15s" }} onFocus={e=>e.target.style.borderColor="#1d4ed8"} onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
                    <button onClick={handleAddTask} disabled={addingTask || !newTask.trim()} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}><Plus size={16}/></button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ATTACHMENTS */}
          <div className="hide-on-print" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={18} color="#1d4ed8" />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Tài liệu đính kèm</h2>
              </div>
              <label style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: uploading ? "not-allowed" : "pointer" }}>
                {uploading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14} />}
                {uploading ? "Đang tải..." : "Tải lên"}
                <input type="file" style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
            <div style={{ padding: "20px" }}>
              {files.length === 0 ? <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "10px 0" }}>Chưa có tài liệu</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {files.map(f => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <FileText size={16} color="#64748b" />
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{f.name}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{formatBytes(f.metadata?.size || 0)}</div></div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleDownload(f.name)} style={actionBtnStyle("#f0fdf4", "#bbf7d0", "#166534")}><Download size={14}/></button>
                        <button onClick={() => handleDeleteFile(f.name)} style={actionBtnStyle("#fff1f2", "#fecdd3", "#e11d48")}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CỘT PHẢI: NHẬT KÝ ── */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)",
          display: "flex", flexDirection: "column", height: "calc(100vh - 128px)", position: "sticky", top: 96
        }} className="print-right print-no-sticky print-height-auto">
          <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
            <MessageSquare size={18} color="#1d4ed8" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Nhật ký xử lý</h2>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#f8fafc" }} className="print-bg-white print-overflow-visible">
            {notes.length === 0 ? <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 40 }}>Chưa có ghi chú nào.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {notes.map(note => (
                  <div key={note.id} style={{ background: "#fff", padding: "16px", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{note.note_content}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {formatDateTime(note.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="hide-on-print" style={{ padding: "16px", borderTop: "1px solid #f1f5f9", background: "#fff" }}>
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Nhập nội dung công việc..." style={{ width: "100%", height: 80, padding: "12px", fontSize: 13, border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none", resize: "none", marginBottom: 12, fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor = "#1d4ed8"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            <button onClick={handleAddNote} disabled={addingNote || !newNote.trim()} style={{ width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, color: "#fff", border: "none", borderRadius: 8, background: (addingNote || !newNote.trim()) ? "#93c5fd" : "#1d4ed8", cursor: (addingNote || !newNote.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background .15s" }}>
              <Plus size={16} /> Thêm ghi chú
            </button>
          </div>
        </div>

      </main>

      {/* IN ẤN CSS */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @media (max-width: 900px) { .print-main { grid-template-columns: 1fr !important; } }
        
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: #fff !important; }
          .print-wrapper { background: #fff !important; }
          .hide-on-print { display: none !important; }
          .show-on-print { display: block !important; }
          
          .print-main { 
            display: block !important; 
            padding: 0 !important; 
            margin-top: 20px !important;
          }
          
          .print-left, .print-right {
            width: 100% !important;
            margin-bottom: 20px !important;
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }
          
          .print-no-sticky { position: static !important; }
          .print-height-auto { height: auto !important; }
          .print-bg-white { background: #fff !important; }
          .print-overflow-visible { overflow: visible !important; }
          
          /* Force colors */
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

const InfoItem = ({ icon: Icon, label, value, isMoney = false }: any) => (
  <div style={{ display: "flex", gap: 12 }}>
    <div style={{ background: isMoney ? "#f0fdf4" : "#f8fafc", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: isMoney ? "#15803d" : "#64748b" }}><Icon size={20}/></div>
    <div>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 15, color: isMoney ? "#059669" : "#0f172a", fontWeight: isMoney ? 700 : 500, marginTop: 2 }}>{value ?? "—"}</div>
    </div>
  </div>
);

const btnNavStyle = { background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", transition: "background 0.2s" };
const actionBtnStyle = (bg: string, border: string, color: string) => ({ background: bg, border: `1px solid ${border}`, color: color, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" });
