"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Briefcase, Calendar, User, Wallet, 
  MessageSquare, Plus, Clock, AlertCircle, LogOut,
  FileText, Download, Trash2, UploadCloud, Loader2,
  CheckSquare, Check, Link as LinkIcon, Printer, CreditCard,
  FileDown, Pencil, X
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { logActivity } from "@/lib/logger";

interface Project {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  service_type: string | null;
  partner_name: string | null;
  status: string | null;
  total_amount: number | null;
  created_at: string | null;
  share_token: string | null;
  due_date?: string | null;
  priority?: string | null;
  created_by?: string | null;
}

interface Note { id: string; note_content: string; created_at: string; }
interface StorageFile { name: string; id: string | null; updated_at: string | null; metadata: any; }
interface Task { id: string; task_name: string; is_completed: boolean; }
interface Payment { id: string; amount: number; note: string | null; created_at: string; }

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
  const { profile, isAdmin, user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [exportMode, setExportMode] = useState<"none" | "hop-dong" | "uy-quyen">("none");
  
  const [taskFetchError, setTaskFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentNote, setNewPaymentNote] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  const [expenses, setExpenses] = useState<Payment[]>([]);
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseNote, setNewExpenseNote] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit]           = useState(false);

  /* edit form state */
  const [tenKhach, setTenKhach]               = useState("");
  const [soDienThoai, setSoDienThoai]         = useState("");
  const [dichVu, setDichVu]                   = useState("");
  const [nguoiGioiThieu, setNguoiGioiThieu]   = useState("");
  const [soTien, setSoTien]                   = useState("");
  const [hanChot, setHanChot]                 = useState("");
  const [doUuTien, setDoUuTien]               = useState("Trung bình");
  const [trangThai, setTrangThai]             = useState("Đang chờ");

  async function fetchDetails() {
    setLoading(true);
    // 1. Dự án
    const { data: projData, error: projError } = await supabase.from("projects").select("*").eq("id", id).single();
    if (projError) { setError("Không tìm thấy hồ sơ hoặc có lỗi xảy ra."); setLoading(false); return; }
    setProject(projData);

    // 2. Ghi chú
    const { data: notesData } = await supabase.from("project_notes").select("*").eq("project_id", id).order("created_at", { ascending: false });
    if (notesData) setNotes(notesData);

    // 3. Tasks
    const { data: tasksData, error: tasksError } = await supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: true });
    if (tasksError) setTaskFetchError(tasksError.message || JSON.stringify(tasksError));
    else { setTasks(tasksData || []); setTaskFetchError(null); }

    // 4. Payments
    const { data: paymentsData, error: payError } = await supabase.from("payments").select("*").eq("project_id", id).order("created_at", { ascending: true });
    if (payError && payError.code !== "42P01") console.error(payError);
    if (paymentsData) setPayments(paymentsData);

    // 4b. Expenses
    const { data: expensesData, error: expError } = await supabase.from("transactions").select("*").eq("project_id", id).eq("type", "CHI").order("created_at", { ascending: true });
    if (expError && expError.code !== "42P01") console.error(expError);
    if (expensesData) setExpenses(expensesData);

    // 5. Files
    fetchFiles();

    // 6. Settings (for PDF)
    const { data: setts } = await supabase.from("settings").select("*").limit(1).single();
    if (setts) setSettings(setts);

    setLoading(false);
  }

  async function fetchFiles() {
    const { data } = await supabase.storage.from('project-documents').list(id);
    if (data) setFiles(data.filter(f => f.name !== ".emptyFolderPlaceholder"));
  }

  function openEditModal() {
    if (!project) return;
    setTenKhach(project.customer_name);
    setSoDienThoai(project.customer_phone || "");
    setDichVu(project.service_type || "");
    setNguoiGioiThieu(project.partner_name || "");
    setSoTien(project.total_amount ? String(project.total_amount) : "");
    setHanChot(project.due_date || "");
    setDoUuTien(project.priority || "Trung bình");
    setTrangThai(project.status || "Đang chờ");
    setIsEditModalOpen(true);
  }

  async function handleEdit() {
    if (!project) return;
    if (!tenKhach.trim()) { toast.warning("Vui lòng nhập tên khách hàng"); return; }
    setSavingEdit(true);
    
    try {
      const { data, error } = await supabase.from("projects").update({
        customer_name: tenKhach.trim(),
        customer_phone: soDienThoai.trim() || null,
        service_type: dichVu.trim() || null,
        partner_name: nguoiGioiThieu.trim() || null,
        total_amount: soTien ? Number(soTien) : null,
        due_date: hanChot || null,
        priority: doUuTien,
        status: trangThai,
        created_by: user?.id
      }).eq("id", id).select().single();

      if (error) throw error;

      toast.success("Cập nhật hồ sơ thành công!");
      if (user && profile) {
        await logActivity(user.id, profile.display_name || "Nhân viên", "đã chỉnh sửa hồ sơ", tenKhach.trim());
      }
      
      setProject(data);
      setIsEditModalOpen(false);
      
      // Sync real-time to Sheets using the updated project data
      await syncToGoogleSheets(undefined, data);
      
      await fetchDetails();
    } catch (err: any) {
      toast.error("Lỗi khi chỉnh sửa hồ sơ", { description: err.message });
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
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
      if (user && profile) await logActivity(user.id, profile.display_name || "User", "đã thêm ghi chú", "Hồ sơ: " + project?.customer_name);
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
    else { 
      toast.success("Tải file lên thành công!"); 
      if (user && profile) await logActivity(user.id, profile.display_name || "User", "đã tải lên tài liệu", file.name);
      fetchFiles(); 
    }
    setUploading(false); e.target.value = '';
  }

  async function handleDownload(fileName: string) {
    const { data, error } = await supabase.storage.from('project-documents').createSignedUrl(`${id}/${fileName}`, 60);
    if (error) toast.error("Lỗi tải file", { description: error.message });
    else if (data?.signedUrl) {
      const link = document.createElement('a'); link.href = data.signedUrl; link.target = "_blank"; link.download = fileName;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
  }

  async function handleDeleteFile(fileName: string) {
    if (!isAdmin) return;
    if (!confirm(`Xóa file "${fileName}"?`)) return;
    const { error } = await supabase.storage.from('project-documents').remove([`${id}/${fileName}`]);
    if (error) toast.error("Lỗi khi xóa file", { description: error.message });
    else { 
      toast.success("Đã xóa file!"); 
      if (user && profile) await logActivity(user.id, profile.display_name || "Admin", "đã xóa tài liệu", fileName);
      fetchFiles(); 
    }
  }

  /* ─── Tasks ─── */
  async function handleAddTask() {
    if (!newTask.trim()) return;
    setAddingTask(true);
    const { error } = await supabase.from("tasks").insert([{ project_id: id, task_name: newTask.trim() }]);
    if (error) toast.error("Lỗi thêm công việc", { description: error.message });
    else {
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
    if (!isAdmin) return;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) toast.error("Lỗi khi xóa", { description: error.message });
    else setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  /* ─── Payments ─── */
  async function handleAddPayment() {
    if (!newPaymentAmount || isNaN(Number(newPaymentAmount))) return;
    setAddingPayment(true);
    const amt = Number(newPaymentAmount);
    const { error } = await supabase.from("payments").insert([{ project_id: id, amount: amt, note: newPaymentNote }]);
    if (error) {
      if (error.code === "42P01") toast.error("Lỗi", { description: "Bảng 'payments' chưa tạo. Chạy lệnh SQL!" });
      else toast.error("Lỗi thanh toán", { description: error.message });
    } else {
      toast.success("Đã ghi nhận thanh toán!");
      if (user && profile) await logActivity(user.id, profile.display_name || "User", "đã ghi nhận thanh toán", formatVND(amt));
      setNewPaymentAmount(""); setNewPaymentNote("");
      const { data } = await supabase.from("payments").select("*").eq("project_id", id).order("created_at", { ascending: true });
      if (data) {
        setPayments(data);
        await syncToGoogleSheets(data);
      }
    }
    setAddingPayment(false);
  }

  async function handleDeletePayment(payId: string, amt: number) {
    if (!isAdmin) return;
    const { error } = await supabase.from("payments").delete().eq("id", payId);
    if (!error) {
      toast.success("Đã xóa đợt thanh toán");
      if (user && profile) await logActivity(user.id, profile.display_name || "Admin", "đã xóa thanh toán", formatVND(amt));
      const remainingPayments = payments.filter(p => p.id !== payId);
      setPayments(remainingPayments);
      await syncToGoogleSheets(remainingPayments);
    }
  }

  /* ─── Expenses ─── */
  async function handleAddExpense() {
    if (!newExpenseAmount || isNaN(Number(newExpenseAmount))) return;
    setAddingExpense(true);
    const amt = Number(newExpenseAmount);
    const { error } = await supabase.from("transactions").insert([{ project_id: id, amount: amt, note: newExpenseNote, type: "CHI" }]);
    if (error) {
      if (error.code === "42P01") toast.error("Lỗi", { description: "Bảng 'transactions' chưa tạo. Chạy lệnh SQL để tạo bảng!" });
      else toast.error("Lỗi ghi chi", { description: error.message });
    } else {
      toast.success("Đã ghi nhận chi phí!");
      if (user && profile) await logActivity(user.id, profile.display_name || "User", "đã ghi nhận chi phí", formatVND(amt));
      setNewExpenseAmount(""); setNewExpenseNote("");
      const { data } = await supabase.from("transactions").select("*").eq("project_id", id).eq("type", "CHI").order("created_at", { ascending: true });
      if (data) setExpenses(data);
    }
    setAddingExpense(false);
  }

  async function handleDeleteExpense(expId: string, amt: number) {
    if (!isAdmin) return;
    const { error } = await supabase.from("transactions").delete().eq("id", expId);
    if (!error) {
      toast.success("Đã xóa khoản chi");
      if (user && profile) await logActivity(user.id, profile.display_name || "Admin", "đã xóa khoản chi", formatVND(amt));
      setExpenses(prev => prev.filter(p => p.id !== expId));
    }
  }

  /* ─── Client Portal Link ─── */
  async function handleGenerateLink() {
    let token = project?.share_token;
    if (!token) {
      token = crypto.randomUUID();
      const { error } = await supabase.from("projects").update({ share_token: token }).eq("id", id);
      if (error) { toast.error("Lỗi", { description: "Chưa thêm cột share_token." }); return; }
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

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalAmount = project?.total_amount || 0;
  const debt = totalAmount - totalPaid;

  const extraLeft = <button aria-label="Quay lại trang chủ" onClick={() => router.push("/")} style={btnNavStyle}><ArrowLeft size={18} /></button>;
  const handleExportContract = (type: "hop-dong" | "uy-quyen") => {
    setExportMode(type);
    setTimeout(() => {
      window.print();
      setExportMode("none");
    }, 100);
  };

  /* Zalo deep link */
  const handleZaloShare = () => {
    if (!project) return;
    const host = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const trackingLink = project.share_token ? `${host}/tracking/${project.share_token}` : `${host}/project/${project.id}`;
    const text = `Xin chào ${project.customer_name}, hồ sơ dịch vụ "${project.service_type || 'Pháp lý'}" của bạn tại GSLaw hiện có trạng thái: [${project.status || 'Đang xử lý'}]. Bạn có thể theo dõi tiến độ chi tiết thời gian thực tại đây: ${trackingLink}`;
    const url = `https://zalo.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  /* Google Sheets sync helper */
  async function syncToGoogleSheets(customPayments?: Payment[], updatedProject?: Project) {
    const activeProject = updatedProject || project;
    if (!activeProject) return;
    const currentPayments = customPayments || payments;
    const paid_amount = currentPayments.reduce((acc, p) => acc + p.amount, 0);
    try {
      const response = await fetch("/api/sync-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...activeProject,
          paid_amount
        }),
      });
      const res = await response.json();
      if (!res.success) {
        console.warn("Sheets sync warning:", res.message);
      } else {
        console.log("Successfully synced to Google Sheets!");
      }
    } catch (err) {
      console.error("Failed to sync to Google Sheets:", err);
    }
  }

  const extraRight = (
    <>
      <button aria-label="Sao chép link tracking chia sẻ khách hàng" onClick={handleGenerateLink} title="Chia sẻ khách hàng" style={{ ...btnNavStyle, background: "#1d4ed8" }}>
        <LinkIcon size={15} /> Tracking
      </button>
      <button aria-label="In báo cáo tiến độ hồ sơ" onClick={() => window.print()} title="In Báo Cáo" style={btnNavStyle}>
        <Printer size={15} /> In Báo Cáo
      </button>
      <button aria-label="Tạo và xuất hợp đồng dịch vụ" onClick={() => handleExportContract("hop-dong")} title="Tạo Hợp Đồng" style={{ ...btnNavStyle, background: "#047857" }}>
        <FileDown size={15} /> Tạo HĐ
      </button>
      <button aria-label="Chỉnh sửa thông tin hồ sơ" onClick={openEditModal} title="Sửa hồ sơ" style={{ ...btnNavStyle, background: "#b45309" }}>
        <Pencil size={15} /> Sửa hồ sơ
      </button>
    </>
  );

  return (
    <div className="print-wrapper" style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      <Header title="Chi tiết Hồ sơ" showActions={true} extraLeft={extraLeft} extraRight={extraRight} />

      {/* PRINT HEADER */}
      <div className="show-on-print" style={{ padding: "40px 40px 0 40px", display: "none", textAlign: "center" }}>
        <h1 style={{ fontSize: 24, color: "#0f2044", marginBottom: 8 }}>{settings?.company_name || "GSLaw Flow"}</h1>
        <div style={{ fontSize: 13, color: "#475569" }}>{settings?.company_address || ""}</div>
        <div style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>{settings?.tax_id ? `MST: ${settings.tax_id}` : ""}</div>
        <div style={{ fontSize: 18, color: "#0f2044", fontWeight: 700, marginTop: 24 }}>BÁO CÁO TIẾN ĐỘ HỒ SƠ</div>
      </div>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }} className="print-main">
        
        {/* ── CỘT TRÁI: THÔNG TIN & FILES & TASKS ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="print-left">
          {error && <div className="hide-on-print" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "16px", color: "#b91c1c", fontSize: 14, display: "flex", gap: 12 }}><AlertCircle size={20} /> <div>{error}</div></div>}

          {/* PROJECT DETAILS */}
          {project && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)", overflow: "hidden" }}>
              <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>{project.customer_name}</h1>
                  <div style={{ display: "inline-block", background: "#eff6ff", color: "#1d4ed8", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>Trạng thái: {project.status ?? "Chưa rõ"}</div>
                </div>
                <button onClick={openEditModal} title="Sửa hồ sơ" className="hide-on-print" style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                  <Pencil size={14} /> Sửa
                </button>
              </div>
              <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <InfoItem icon={Briefcase} label="Dịch vụ" value={project.service_type} />
                <InfoItem icon={User} label="Người giới thiệu" value={project.partner_name} />
                <InfoItem icon={Wallet} label="Phí dịch vụ" value={project.total_amount ? formatVND(project.total_amount) : null} isMoney />
                <InfoItem icon={Calendar} label="Ngày tạo" value={project.created_at ? formatDateTime(project.created_at).split(" - ")[1] : null} />
              </div>
            </div>
          )}

          {/* PAYMENTS */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CreditCard size={18} color="#10b981" />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Tiến độ thanh toán</h2>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>ĐÃ THU</div><div style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>{formatVND(totalPaid)}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>CÔNG NỢ</div><div style={{ fontSize: 14, fontWeight: 700, color: debt > 0 ? "#dc2626" : "#475569" }}>{formatVND(debt)}</div></div>
              </div>
            </div>
            
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {payments.length === 0 ? <div style={{ fontSize: 13, color: "#475569", textAlign: "center" }}>Chưa có đợt thanh toán nào</div> : payments.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Đợt {i+1}: {formatVND(p.amount)}</div>
                      {p.note && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{p.note}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, color: "#475569" }}>{formatDateTime(p.created_at).split(" - ")[1]}</span>
                      {isAdmin && <button aria-label="Xóa đợt thanh toán" className="hide-on-print" onClick={() => handleDeletePayment(p.id, p.amount)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="hide-on-print" style={{ display: "flex", gap: 8 }}>
                <input id="new-payment-amount" aria-label="Số tiền thanh toán" type="number" value={newPaymentAmount} onChange={e=>setNewPaymentAmount(e.target.value)} placeholder="Số tiền (đ)..." style={{ width: 140, padding: "8px 12px", fontSize: 13, border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none" }} />
                <input id="new-payment-note" aria-label="Ghi chú thanh toán" type="text" value={newPaymentNote} onChange={e=>setNewPaymentNote(e.target.value)} placeholder="Ghi chú (Tạm ứng...)" style={{ flex: 1, padding: "8px 12px", fontSize: 13, border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none" }} onKeyDown={e=>e.key==="Enter"&&handleAddPayment()} />
                <button onClick={handleAddPayment} disabled={addingPayment || !newPaymentAmount} style={{ background: (addingPayment || !newPaymentAmount) ? "#cbd5e1" : "#047857", color: (addingPayment || !newPaymentAmount) ? "#64748b" : "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontWeight: 600, fontSize: 13, cursor: (addingPayment || !newPaymentAmount) ? "not-allowed" : "pointer" }}>Thu tiền</button>
              </div>
            </div>
          </div>

          {/* EXPENSES */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Wallet size={18} color="#dc2626" />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Chi phí thực hiện</h2>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>TỔNG CHI</div><div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{formatVND(expenses.reduce((acc, p) => acc + p.amount, 0))}</div></div>
              </div>
            </div>
            
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {expenses.length === 0 ? <div style={{ fontSize: 13, color: "#475569", textAlign: "center" }}>Chưa có khoản chi nào</div> : expenses.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecdd3", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b" }}>Đợt {i+1}: {formatVND(p.amount)}</div>
                      {p.note && <div style={{ fontSize: 12, color: "#991b1b", marginTop: 2 }}>{p.note}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, color: "#991b1b" }}>{formatDateTime(p.created_at).split(" - ")[1]}</span>
                      {isAdmin && <button aria-label="Xóa đợt chi" className="hide-on-print" onClick={() => handleDeleteExpense(p.id, p.amount)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="hide-on-print" style={{ display: "flex", gap: 8 }}>
                <input id="new-expense-amount" aria-label="Số tiền chi" type="number" value={newExpenseAmount} onChange={e=>setNewExpenseAmount(e.target.value)} placeholder="Số tiền (đ)..." style={{ width: 140, padding: "8px 12px", fontSize: 13, border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none" }} />
                <input id="new-expense-note" aria-label="Ghi chú chi" type="text" value={newExpenseNote} onChange={e=>setNewExpenseNote(e.target.value)} placeholder="Ghi chú (Lệ phí...)" style={{ flex: 1, padding: "8px 12px", fontSize: 13, border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none" }} onKeyDown={e=>e.key==="Enter"&&handleAddExpense()} />
                <button onClick={handleAddExpense} disabled={addingExpense || !newExpenseAmount} style={{ background: (addingExpense || !newExpenseAmount) ? "#cbd5e1" : "#ea580c", color: (addingExpense || !newExpenseAmount) ? "#64748b" : "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontWeight: 600, fontSize: 13, cursor: (addingExpense || !newExpenseAmount) ? "not-allowed" : "pointer" }}>Ghi chi</button>
              </div>
            </div>
          </div>

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
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#475569", fontSize: 13 }}>
                <AlertCircle size={24} color="#dc2626" style={{ margin: "0 auto 10px" }} />
                Chưa thể tải danh sách công việc.<br/>
                <span style={{ fontSize: 11, color: "#475569" }}>Lỗi: {taskFetchError}</span>
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
                          <input 
                            type="checkbox" 
                            checked={task.is_completed} 
                            onChange={() => toggleTask(task.id, task.is_completed)} 
                            className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600" 
                            aria-label={task.task_name}
                          />
                          <span style={{ fontSize: 14, color: task.is_completed ? "#475569" : "#0f172a", textDecoration: task.is_completed ? "line-through" : "none", fontWeight: 500, transition: "all 0.2s" }}>{task.task_name}</span>
                        </label>
                        {isAdmin && <button aria-label="Xóa công việc" className="hide-on-print" onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>}
                      </div>
                    ))}
                  </div>
                  
                  <div className="hide-on-print" style={{ display: "flex", gap: 8 }}>
                    <input id="new-task" aria-label="Tên công việc mới" type="text" value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAddTask()} placeholder="Thêm công việc mới..." style={{ flex: 1, padding: "8px 12px", fontSize: 13, border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none", transition: "border-color .15s" }} onFocus={e=>e.target.style.borderColor="#1d4ed8"} onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
                    <button onClick={handleAddTask} disabled={addingTask || !newTask.trim()} style={{ background: (addingTask || !newTask.trim()) ? "#cbd5e1" : "#1d4ed8", color: (addingTask || !newTask.trim()) ? "#64748b" : "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontWeight: 600, fontSize: 13, cursor: (addingTask || !newTask.trim()) ? "not-allowed" : "pointer" }}><Plus size={16}/></button>
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
                <input type="file" aria-label="Tải lên tài liệu đính kèm" style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
            <div style={{ padding: "20px" }}>
              {files.length === 0 ? <div style={{ textAlign: "center", color: "#475569", fontSize: 13, padding: "10px 0" }}>Chưa có tài liệu</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {files.map(f => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <FileText size={16} color="#64748b" />
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{f.name}</div><div style={{ fontSize: 11, color: "#475569" }}>{formatBytes(f.metadata?.size || 0)}</div></div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button aria-label={`Tải tài liệu ${f.name}`} onClick={() => handleDownload(f.name)} style={actionBtnStyle("#f0fdf4", "#bbf7d0", "#166534")}><Download size={14}/></button>
                        {isAdmin && <button aria-label={`Xóa tài liệu ${f.name}`} onClick={() => handleDeleteFile(f.name)} style={actionBtnStyle("#fff1f2", "#fecdd3", "#e11d48")}><Trash2 size={14}/></button>}
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
            {notes.length === 0 ? <div style={{ textAlign: "center", color: "#475569", fontSize: 13, marginTop: 40 }}>Chưa có ghi chú nào.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {notes.map(note => (
                  <div key={note.id} style={{ background: "#fff", padding: "16px", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{note.note_content}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {formatDateTime(note.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="hide-on-print" style={{ padding: "16px", borderTop: "1px solid #f1f5f9", background: "#fff" }}>
            <textarea id="new-note" aria-label="Nội dung ghi chú" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Nhập nội dung công việc..." style={{ width: "100%", height: 80, padding: "12px", fontSize: 13, border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none", resize: "none", marginBottom: 12, fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor = "#1d4ed8"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            <button onClick={handleAddNote} disabled={addingNote || !newNote.trim()} style={{ width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, color: (addingNote || !newNote.trim()) ? "#64748b" : "#fff", border: "none", borderRadius: 8, background: (addingNote || !newNote.trim()) ? "#cbd5e1" : "#1d4ed8", cursor: (addingNote || !newNote.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background .15s" }}>
              <Plus size={16} /> Thêm ghi chú
            </button>
          </div>
        </div>

      </main>

      {/* QUICK EXPORT LAYOUTS */}
      {exportMode !== "none" && (
        <div className="print-only-export" style={{ padding: "40px", fontFamily: "'Times New Roman', serif", fontSize: "12pt", lineHeight: 1.5, display: "none" }}>
          {exportMode === "hop-dong" && (
            <>
              <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: 20 }}>
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br/>
                Độc lập - Tự do - Hạnh phúc<br/>
                ***<br/><br/>
                HỢP ĐỒNG DỊCH VỤ PHÁP LÝ
              </div>
              <div>
                Hôm nay, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}, tại văn phòng {settings?.company_name || "GSLaw"}. Chúng tôi gồm:<br/><br/>
                <strong>BÊN CUNG CẤP DỊCH VỤ (Bên A): {settings?.company_name || "CÔNG TY LUẬT GSLAW"}</strong><br/>
                Địa chỉ: {settings?.company_address || "..........................................................................."}<br/>
                Mã số thuế: {settings?.tax_id || "..........................."}<br/><br/>
                <strong>BÊN SỬ DỤNG DỊCH VỤ (Bên B): {project?.customer_name?.toUpperCase() || "..................................................."}</strong><br/>
                Số điện thoại: {project?.customer_phone || "..........................."}<br/>
                Đại diện: ...........................................................................<br/><br/>
                <strong>ĐIỀU 1: NỘI DUNG DỊCH VỤ</strong><br/>
                Bên B đồng ý thuê Bên A cung cấp dịch vụ pháp lý: <strong>{project?.service_type || "..................................................."}</strong>.<br/><br/>
                <strong>ĐIỀU 2: PHÍ DỊCH VỤ VÀ THANH TOÁN</strong><br/>
                Phí dịch vụ trọn gói là: <strong>{formatVND(project?.total_amount || 0)}</strong>.<br/>
                Đã thanh toán: <strong>{formatVND(totalPaid || 0)}</strong>. Còn lại: <strong>{formatVND(debt || 0)}</strong>.<br/><br/>
                (Hợp đồng này được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.)
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 50, textAlign: "center", fontWeight: "bold" }}>
                <div>ĐẠI DIỆN BÊN A</div>
                <div>ĐẠI DIỆN BÊN B</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* IN ẤN CSS */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @media (max-width: 900px) { .print-main { grid-template-columns: 1fr !important; } }
        
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          
          ${exportMode !== "none" ? `
            body * { visibility: hidden; }
            .print-only-export, .print-only-export * { visibility: visible; }
            .print-only-export { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
          ` : `
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
          `}
          
          /* Force colors */
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>

      {/* ─── EDIT MODAL ─── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">Chỉnh sửa hồ sơ</span>
              <button aria-label="Đóng" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
              <div><label htmlFor="edit-ten" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Tên KH *</label><input id="edit-ten" type="text" placeholder="CÔNG TY..." value={tenKhach} onChange={e=>setTenKhach(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div><label htmlFor="edit-phone" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Số điện thoại</label><input id="edit-phone" type="text" placeholder="090..." value={soDienThoai} onChange={e=>setSoDienThoai(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div><label htmlFor="edit-service" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Dịch vụ</label><input id="edit-service" type="text" placeholder="Loại..." value={dichVu} onChange={e=>setDichVu(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div><label htmlFor="edit-partner" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Người GT</label><input id="edit-partner" type="text" placeholder="Tên..." value={nguoiGioiThieu} onChange={e=>setNguoiGioiThieu(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div><label htmlFor="edit-amount" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Giá trị (đ)</label><input id="edit-amount" type="number" placeholder="1000000" value={soTien} onChange={e=>setSoTien(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div><label htmlFor="edit-duedate" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Hạn chót</label><input id="edit-duedate" type="date" value={hanChot} onChange={e=>setHanChot(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div>
                <label htmlFor="edit-priority" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Ưu tiên</label>
                <select id="edit-priority" value={doUuTien} onChange={e=>setDoUuTien(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100 [&>option]:bg-white dark:[&>option]:bg-slate-800">
                  <option value="Thường">Thường (Xanh)</option>
                  <option value="Trung bình">Trung bình (Vàng)</option>
                  <option value="Gấp">Gấp (Đỏ)</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-status" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Trạng thái</label>
                <select id="edit-status" value={trangThai} onChange={e=>setTrangThai(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100 [&>option]:bg-white dark:[&>option]:bg-slate-800">
                  <option value="Đang chờ">Đang chờ</option>
                  <option value="Đang làm">Đang làm</option>
                  <option value="Cần bổ sung">Cần bổ sung</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Hủy</button>
              <button onClick={handleEdit} disabled={savingEdit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 transition-colors">
                {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const InfoItem = ({ icon: Icon, label, value, isMoney = false }: any) => (
  <div style={{ display: "flex", gap: 12 }}>
    <div style={{ background: isMoney ? "#f0fdf4" : "#f8fafc", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: isMoney ? "#15803d" : "#475569" }}><Icon size={20}/></div>
    <div>
      <div style={{ fontSize: 12, color: "#475569", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 15, color: isMoney ? "#059669" : "#0f172a", fontWeight: isMoney ? 700 : 500, marginTop: 2 }}>{value ?? "—"}</div>
    </div>
  </div>
);

const btnNavStyle = { background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", transition: "background 0.2s" };
const actionBtnStyle = (bg: string, border: string, color: string) => ({ background: bg, border: `1px solid ${border}`, color: color, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" });
