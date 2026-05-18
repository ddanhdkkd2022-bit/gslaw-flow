"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Briefcase, Wallet, Clock, Search, Plus, Trash2,
  TrendingUp, AlertCircle, Eye, Download, Filter,
  Calendar as CalendarIcon, LayoutGrid, List, X, Pencil
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { logActivity } from "@/lib/logger";

// Calendar
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { "vi": vi };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

/* ─── Types ─────────────────────────────────────────── */
interface HoSo {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  priority?: string | null;
  service_type: string | null;
  partner_name: string | null;
  status: string | null;
  total_amount: number | null;
  paid_amount?: number;
  created_at: string | null;
  due_date: string | null;
  share_token?: string | null;
  created_by?: string | null;
}

/* ─── Status config ─────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: "Đang chờ",   label: "Đang chờ" },
  { value: "Đang soạn",  label: "Đang soạn" },
  { value: "Đang nộp",   label: "Đang nộp" },
  { value: "Hoàn thành", label: "Hoàn thành" },
];

function getStatusStyle(val: string | null) {
  switch (val) {
    case "Đang chờ": return "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    case "Đang soạn": return "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
    case "Đang nộp": return "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20";
    case "Hoàn thành": return "bg-green-50 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20";
    default: return "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }
}

/* ─── Service Badge Config ─────────────────────────── */
function getServiceBadgeStyle(val: string | null) {
  if (!val) return "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  const clean = val.trim().toLowerCase();
  if (clean.includes("thành lập") || clean.includes("doanh nghiệp") || clean.includes("giấy phép")) {
    return "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  }
  if (clean.includes("thuế") || clean.includes("kế toán") || clean.includes("báo cáo")) {
    return "bg-green-50 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20";
  }
  if (clean.includes("tranh chấp") || clean.includes("tố tụng") || clean.includes("tòa án")) {
    return "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
  }
  if (clean.includes("sở hữu") || clean.includes("thương hiệu") || clean.includes("bản quyền")) {
    return "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20";
  }
  return "bg-slate-50 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
}

/* ─── Priority Badge Config ────────────────────────── */
function getPriorityStyle(val: string | null) {
  switch (val) {
    case "Gấp": return "bg-red-50 text-red-600 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
    case "Trung bình": return "bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    case "Thường":
    default: return "bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  }
}

/* ─── Helpers ───────────────────────────────────────── */
function formatVND(n: number) { return n.toLocaleString("vi-VN") + "đ"; }
function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

function downloadCSV(data: HoSo[]) {
  if (data.length === 0) return toast.info("Không có dữ liệu để xuất");
  const headers = ["Khách hàng", "Số điện thoại", "Dịch vụ", "Độ ưu tiên", "Người giới thiệu", "Trạng thái", "Giá trị", "Đã thanh toán", "Ngày tạo", "Hạn chót"];
  const rows = data.map(item => [
    `"${item.customer_name || ""}"`,
    `"${item.customer_phone || ""}"`,
    `"${item.service_type || ""}"`,
    `"${item.priority || "Trung bình"}"`,
    `"${item.partner_name || ""}"`,
    `"${item.status || ""}"`,
    item.total_amount || 0,
    item.paid_amount || 0,
    `"${formatDate(item.created_at)}"`,
    `"${formatDate(item.due_date)}"`
  ]);
  const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `GSLaw_Export_${new Date().getTime()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success("Đã xuất file CSV thành công!");
}

/* ─── Stat Card ─────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, accentClass, bgClass }: {
  label: string; value: string | number; icon: React.ElementType; accentClass: string; bgClass: string;
}) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 p-5 flex items-center gap-4 shadow-sm ${accentClass}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
        <Icon size={22} className="opacity-80" strokeWidth={2} />
      </div>
      <div>
        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{label}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">{value}</div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────── */
export default function GSLawDashboard() {
  const { profile, isAdmin, user } = useAuth();
  const [hoso, setHoso]       = useState<HoSo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [adding, setAdding]   = useState(false);
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"table" | "kanban" | "calendar">("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<HoSo | null>(null);

  /* form state */
  const [tenKhach, setTenKhach]               = useState("");
  const [soDienThoai, setSoDienThoai]         = useState("");
  const [dichVu, setDichVu]                   = useState("");
  const [nguoiGioiThieu, setNguoiGioiThieu]   = useState("");
  const [soTien, setSoTien]                   = useState("");
  const [hanChot, setHanChot]                 = useState("");
  const [doUuTien, setDoUuTien]               = useState("Trung bình");

  /* filter state */
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPartner, setFilterPartner]= useState("");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  
  /* new employee filter state */
  const [employees, setEmployees]       = useState<{ id: string; display_name: string | null; role: string }[]>([]);
  const [filterEmployee, setFilterEmployee] = useState("");

  /* schema warning state */
  const [isSchemaOutdated, setIsSchemaOutdated] = useState(false);

  const handleCopySQL = () => {
    const sql = `ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();
NOTIFY pgrst, 'reload_schema';`;
    navigator.clipboard.writeText(sql);
    toast.success("Đã sao chép mã SQL vào clipboard!");
  };

  /* sync to Google Sheets helper */
  async function syncToGoogleSheets(projectData: HoSo) {
    try {
      const response = await fetch("/api/sync-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
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

  /* fetch */
  async function fetchData() {
    setLoading(true);
    const { data: projData, error: projError } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    const { data: payData } = await supabase.from("payments").select("project_id, amount");

    if (projError) {
      console.error(projError);
      setError(projError.message);
    } else {
      const payMap: Record<string, number> = {};
      if (payData) {
        payData.forEach(p => {
          if (p.project_id) {
            payMap[p.project_id] = (payMap[p.project_id] || 0) + (p.amount || 0);
          }
        });
      }

      const mapped = (projData ?? []).map(p => ({
        ...p,
        paid_amount: payMap[p.id] || 0
      }));

      // Proactively detect if created_by column is missing from schema
      if (projData && projData.length > 0 && !('created_by' in projData[0])) {
        setIsSchemaOutdated(true);
      }

      setHoso(mapped);
      setError(null);
    }

    // Fetch profiles if Admin to populate employee filter dropdown
    if (isAdmin) {
      const { data: profData } = await supabase.from("profiles").select("id, display_name, role");
      if (profData) {
        setEmployees(profData);
      }
    }

    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [isAdmin]);

  /* add */
  async function handleAdd() {
    if (!tenKhach.trim()) { toast.warning("Vui lòng nhập tên khách hàng"); return; }
    setAdding(true);
    
    // Try inserting with created_by column first
    let { data, error } = await supabase.from("projects").insert([{
      customer_name: tenKhach.trim(),
      customer_phone: soDienThoai.trim() || null,
      service_type: dichVu.trim() || null,
      partner_name: nguoiGioiThieu.trim() || null,
      total_amount: soTien ? Number(soTien) : null,
      due_date: hanChot || null,
      priority: doUuTien,
      created_by: user?.id
    }]).select().single();

    // Catch missing column error PGRST204 and degrade gracefully
    if (error && (error.code === "PGRST204" || error.message?.includes("created_by"))) {
      console.warn("Supabase schema is missing 'created_by' column. Falling back to regular insert.");
      setIsSchemaOutdated(true);
      
      const retryResult = await supabase.from("projects").insert([{
        customer_name: tenKhach.trim(),
        customer_phone: soDienThoai.trim() || null,
        service_type: dichVu.trim() || null,
        partner_name: nguoiGioiThieu.trim() || null,
        total_amount: soTien ? Number(soTien) : null,
        due_date: hanChot || null,
        priority: doUuTien
      }]).select().single();
      
      data = retryResult.data;
      error = retryResult.error;
      
      if (!error) {
        toast.info("Đã lưu hồ sơ thành công (Chế độ tương thích). Vui lòng cập nhật Schema bảo mật.");
      }
    }

    if (error) {
      toast.error("Lỗi khi thêm hồ sơ", { description: error.message });
    } else { 
      toast.success("Thêm hồ sơ thành công!");
      if (user && profile) await logActivity(user.id, profile.display_name || "Nhân viên", "đã thêm hồ sơ mới", tenKhach.trim());
      setTenKhach(""); setSoDienThoai(""); setDichVu(""); setNguoiGioiThieu(""); setSoTien(""); setHanChot(""); setDoUuTien("Trung bình");
      setIsAddModalOpen(false);
      
      // Sync real-time to Sheets
      if (data) {
        await syncToGoogleSheets({
          ...data,
          paid_amount: 0
        });
      }
      
      await fetchData(); 
    }
    setAdding(false);
  }

  function resetForm() {
    setTenKhach("");
    setSoDienThoai("");
    setDichVu("");
    setNguoiGioiThieu("");
    setSoTien("");
    setHanChot("");
    setDoUuTien("Trung bình");
    setEditingProject(null);
  }

  function openEditModal(project: HoSo) {
    setEditingProject(project);
    setTenKhach(project.customer_name);
    setSoDienThoai(project.customer_phone || "");
    setDichVu(project.service_type || "");
    setNguoiGioiThieu(project.partner_name || "");
    setSoTien(project.total_amount ? String(project.total_amount) : "");
    setHanChot(project.due_date || "");
    setDoUuTien(project.priority || "Trung bình");
    setIsAddModalOpen(true);
  }

  async function handleEdit() {
    if (!editingProject) return;
    if (!tenKhach.trim()) { toast.warning("Vui lòng nhập tên khách hàng"); return; }
    setAdding(true);
    
    try {
      const { data, error } = await supabase.from("projects").update({
        customer_name: tenKhach.trim(),
        customer_phone: soDienThoai.trim() || null,
        service_type: dichVu.trim() || null,
        partner_name: nguoiGioiThieu.trim() || null,
        total_amount: soTien ? Number(soTien) : null,
        due_date: hanChot || null,
        priority: doUuTien,
        created_by: user?.id
      }).eq("id", editingProject.id).select().single();

      if (error) throw error;

      toast.success("Cập nhật hồ sơ thành công!");
      if (user && profile) {
        await logActivity(user.id, profile.display_name || "Nhân viên", "đã chỉnh sửa hồ sơ", tenKhach.trim());
      }
      
      resetForm();
      setIsAddModalOpen(false);
      
      // Sync real-time to Sheets
      if (data) {
        const paid_amount = editingProject.paid_amount || 0;
        await syncToGoogleSheets({
          ...data,
          paid_amount
        });
      }
      
      await fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi chỉnh sửa hồ sơ", { description: err.message });
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  /* delete */
  async function handleDelete(id: string | number, name: string) {
    if (!isAdmin) return;
    if (!confirm(`Xóa hồ sơ "${name}"?\nHành động này không thể hoàn tác.`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) toast.error("Lỗi khi xóa", { description: error.message });
    else { 
      toast.success("Đã xóa hồ sơ " + name); 
      if (user && profile) await logActivity(user.id, profile.display_name || "Admin", "đã xóa hồ sơ", name);
      await fetchData(); 
    }
  }

  /* status update */
  async function handleStatus(id: string | number, val: string) {
    const { data, error } = await supabase.from("projects").update({ status: val }).eq("id", id).select().single();
    if (error) {
      toast.error("Lỗi cập nhật trạng thái", { description: error.message });
    } else {
      toast.success("Đã cập nhật trạng thái thành: " + val);
      if (user && profile) await logActivity(user.id, profile.display_name || "Nhân viên", "đã cập nhật trạng thái thành " + val, "Hồ sơ ID: " + id);
      
      setHoso(prev => prev.map(h => h.id === id ? { ...h, status: val } : h));

      // Sync updated record to Sheets
      if (data) {
        const localRecord = hoso.find(h => h.id === id);
        await syncToGoogleSheets({
          ...data,
          paid_amount: localRecord?.paid_amount || 0
        });
      }
    }
  }

  /* Zalo deep link handler */
  function handleZaloShare(item: HoSo) {
    const host = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const trackingLink = item.share_token ? `${host}/tracking/${item.share_token}` : `${host}/project/${item.id}`;
    const text = `Xin chào ${item.customer_name}, hồ sơ dịch vụ "${item.service_type || 'Pháp lý'}" của bạn tại GSLaw hiện có trạng thái: [${item.status || 'Đang xử lý'}]. Bạn có thể theo dõi tiến độ chi tiết thời gian thực tại đây: ${trackingLink}`;
    const url = `https://zalo.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  /* computed filters */
  const filtered = useMemo(() => {
    return hoso.filter(h => {
      if (search && !h.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && h.status !== filterStatus) return false;
      if (filterPartner && h.partner_name !== filterPartner) return false;
      if (isAdmin && filterEmployee && h.created_by !== filterEmployee) return false;
      if (dateFrom || dateTo) {
        if (!h.created_at) return false;
        const d = new Date(h.created_at).getTime();
        if (dateFrom && d < new Date(dateFrom).getTime()) return false;
        if (dateTo && d > new Date(dateTo).getTime() + 86400000) return false;
      }
      return true;
    });
  }, [hoso, search, filterStatus, filterPartner, filterEmployee, dateFrom, dateTo, isAdmin]);

  const uniquePartners = Array.from(new Set(hoso.map(h => h.partner_name).filter(Boolean))) as string[];
  const totalDoanhThu = filtered.reduce((s, h) => s + (Number(h.total_amount) || 0), 0);
  const dangXuLy      = filtered.filter(h => h.status !== "Hoàn thành").length;

  /* Chart Data */
  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    filtered.forEach(h => { const s = h.status || "Chưa rõ"; data[s] = (data[s] || 0) + 1; });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [filtered]);
  const COLORS = ['#fcd34d', '#93c5fd', '#7dd3fc', '#86efac', '#cbd5e1'];

  const isWarning = (dueDate: string | null, status: string | null) => {
    if (!dueDate || status === "Hoàn thành") return false;
    const today = new Date().getTime();
    const due = new Date(dueDate).getTime();
    return (due - today) < 259200000;
  };

  /* Calendar Events */
  const calendarEvents = useMemo(() => {
    return filtered.filter(h => h.due_date).map(h => ({
      id: h.id,
      title: `${h.customer_name} ${h.service_type ? `(${h.service_type})` : ''}`,
      start: new Date(h.due_date!),
      end: new Date(h.due_date!),
      allDay: true,
      resource: h
    }));
  }, [filtered]);

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors">
      <Header title="GSLaw Flow" showActions={true} />

      <main className="max-w-[1400px] mx-auto p-6 md:p-8 flex flex-col gap-6">

        {/* Schema Outdated Warning Component */}
        {isSchemaOutdated && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex gap-3">
              <AlertCircle className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Yêu cầu thiết lập Bảo mật dữ liệu</h4>
                <p className="text-xs text-amber-700 dark:text-amber-500 mt-1 leading-relaxed">
                  Cơ sở dữ liệu Supabase chưa được cập nhật cấu trúc cột mới. Vui lòng bấm sao chép và chạy lệnh SQL cập nhật để kích hoạt tính năng cô lập dữ liệu theo nhân viên.
                </p>
              </div>
            </div>
            <button 
              onClick={handleCopySQL} 
              className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-white dark:text-amber-400 border-none rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer shadow-sm transition-all self-start sm:self-center whitespace-nowrap"
            >
              Copy Mã SQL
            </button>
          </div>
        )}

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tổng hồ sơ hiển thị" value={filtered.length} icon={Briefcase} accentClass="border-l-blue-600 dark:border-l-blue-500" bgClass="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500" />
          <StatCard label="Đang xử lý" value={dangXuLy} icon={Clock} accentClass="border-l-amber-500 dark:border-l-amber-500" bgClass="bg-amber-50 dark:bg-amber-500/10 text-amber-500" />
          {isAdmin && <StatCard label="Doanh thu dự kiến" value={formatVND(totalDoanhThu)} icon={Wallet} accentClass="border-l-emerald-600 dark:border-l-emerald-500" bgClass="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500" />}
          <StatCard label="Hoàn thành" value={filtered.filter(h=>h.status==="Hoàn thành").length} icon={TrendingUp} accentClass="border-l-purple-600 dark:border-l-purple-500" bgClass="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-500" />
        </div>

        {/* ── CONTENT ── */}
        <div className={`rounded-xl shadow-sm overflow-hidden ${viewMode === "table" ? "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" : ""}`}>
          
          {/* Controls Header */}
          <div className="p-4 md:p-5 flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            
            <div className="flex gap-3 items-center flex-1 min-w-[280px]">
              <div className="flex items-center gap-2 flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <Search size={16} className="text-slate-400" />
                <input placeholder="Tìm tên khách hàng... (Nhấn Ctrl+K)" value={search} onChange={e=>setSearch(e.target.value)} className="border-none outline-none text-sm w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400" />
              </div>

              <button onClick={() => setIsAddModalOpen(true)} className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-none rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 whitespace-nowrap transition-all">
                <Plus size={16} /> Thêm hồ sơ
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-500" />
                <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-900 dark:text-slate-100">
                  <option value="">Trạng thái</option>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={filterPartner} onChange={e=>setFilterPartner(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-900 dark:text-slate-100 hidden md:block">
                  <option value="">Nguồn GT</option>
                  {uniquePartners.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {isAdmin && (
                  <select value={filterEmployee} onChange={e=>setFilterEmployee(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-900 dark:text-slate-100">
                    <option value="">Xem theo nhân viên</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.display_name || emp.role}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-3 md:border-l border-slate-300 dark:border-slate-600 md:pl-4">
                <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                  <button onClick={() => setViewMode("table")} className={`rounded-md px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-all ${viewMode === "table" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                    <List size={16} /> <span className="hidden sm:inline">Bảng</span>
                  </button>
                  <button onClick={() => setViewMode("kanban")} className={`rounded-md px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-all ${viewMode === "kanban" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                    <LayoutGrid size={16} /> <span className="hidden sm:inline">Kanban</span>
                  </button>
                  <button onClick={() => setViewMode("calendar")} className={`rounded-md px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-all ${viewMode === "calendar" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                    <CalendarIcon size={16} /> <span className="hidden sm:inline">Lịch biểu</span>
                  </button>
                </div>
                <button onClick={() => downloadCSV(filtered)} className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                  <Download size={16} /> <span className="hidden sm:inline">CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW: TABLE */}
          {viewMode === "table" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 border-collapse">
                  <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold tracking-wider">Khách hàng</th>
                      <th className="px-4 py-3 font-semibold tracking-wider">Dịch vụ</th>
                      <th className="px-4 py-3 font-semibold tracking-wider">Ưu tiên</th>
                      <th className="px-4 py-3 font-semibold tracking-wider">Nguồn</th>
                      <th className="px-4 py-3 font-semibold tracking-wider">Hạn chót</th>
                      <th className="px-4 py-3 font-semibold tracking-wider">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold tracking-wider text-right">Giá trị</th>
                      <th className="px-4 py-3 font-semibold tracking-wider text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} className="text-center py-12 text-slate-400">Đang tải dữ liệu...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-slate-400">Không tìm thấy hồ sơ phù hợp</td></tr>
                    ) : (
                      filtered.map((item) => {
                        const warn = isWarning(item.due_date, item.status);
                        const rowClass = warn ? "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50";
                        return (
                          <tr key={item.id} onClick={() => router.push(`/project/${item.id}`)} className={`border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${rowClass}`}>
                            
                            <td className="px-4 py-3 align-middle">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.customer_name}</span>
                                <div className="flex gap-2 items-center text-xs mt-0.5">
                                  {item.customer_phone && <span className="text-slate-500 dark:text-slate-400">{item.customer_phone}</span>}
                                  {item.customer_phone && isAdmin && <span className="text-slate-300 dark:text-slate-600">|</span>}
                                  {isAdmin && (
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                                      Phụ trách: {employees.find(e => e.id === item.created_by)?.display_name || "Chưa rõ"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3 align-middle">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getServiceBadgeStyle(item.service_type)}`}>{item.service_type ?? "—"}</span>
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getPriorityStyle(item.priority || null)}`}>{item.priority ?? "Trung bình"}</span>
                            </td>

                            <td className="px-4 py-3 align-middle text-slate-500 dark:text-slate-400">{item.partner_name ?? "—"}</td>
                            
                            <td className={`px-4 py-3 align-middle whitespace-nowrap ${warn ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                              <div className="flex items-center gap-1.5">{formatDate(item.due_date)}{warn && <AlertCircle size={14} className="text-red-500" />}</div>
                            </td>
                            
                            <td className="px-4 py-3 align-middle" onClick={e => e.stopPropagation()}>
                              <select value={item.status ?? ""} onChange={e => handleStatus(item.id, e.target.value)} className={`text-xs font-semibold rounded-full px-2 py-1 outline-none border cursor-pointer ${getStatusStyle(item.status)}`}>
                                <option value="" disabled>— Chọn —</option>
                                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </td>

                            <td className="px-4 py-3 align-middle text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-bold text-slate-900 dark:text-slate-100">{item.total_amount ? formatVND(Number(item.total_amount)) : "—"}</span>
                                {item.total_amount && (
                                  <>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Đã thu {formatVND(item.paid_amount || 0)}</span>
                                    <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.round(((item.paid_amount || 0) / (item.total_amount || 1)) * 100))}%` }} />
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3 align-middle text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex gap-2 justify-center">
                                <button onClick={() => handleZaloShare(item)} title="Gửi Zalo" className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white border-none rounded text-[11px] font-semibold cursor-pointer shadow-sm transition-colors">Zalo</button>
                                <button onClick={() => router.push(`/project/${item.id}`)} title="Xem" className="p-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"><Eye size={14} /></button>
                                <button onClick={() => openEditModal(item)} title="Sửa" className="p-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"><Pencil size={14} /></button>
                                {isAdmin && <button onClick={() => handleDelete(item.id, item.customer_name)} title="Xóa" className="p-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"><Trash2 size={14} /></button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-right bg-slate-50/50 dark:bg-slate-800/30">Hiển thị {filtered.length} hồ sơ</div>
            </>
          )}

          {/* VIEW: KANBAN */}
          {viewMode === "kanban" && (
            <div className="flex gap-4 overflow-x-auto p-4 md:p-6 items-start">
              {STATUS_OPTIONS.map(col => {
                const colItems = filtered.filter(h => (h.status === col.value) || (!h.status && col.value === "Đang chờ"));
                return (
                  <div key={col.value} className="shrink-0 w-[300px] bg-slate-50/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${col.value === "Hoàn thành" ? "bg-emerald-500" : col.value === "Đang soạn" ? "bg-blue-500" : col.value === "Đang nộp" ? "bg-sky-500" : "bg-amber-500"}`} />
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{col.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{colItems.length}</span>
                    </div>

                    {colItems.map(item => {
                      const warn = isWarning(item.due_date, item.status);
                      return (
                        <div key={item.id} onClick={() => router.push(`/project/${item.id}`)} className={`bg-white dark:bg-slate-900 rounded-xl border p-4 shadow-sm cursor-pointer transition-transform hover:-translate-y-0.5 relative ${warn ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-slate-700'}`}>
                          {warn && <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm"><AlertCircle size={12}/></div>}
                          
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 break-words">{item.customer_name}</div>
                          {isAdmin && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-medium">
                              Phụ trách: {employees.find(e => e.id === item.created_by)?.display_name || "Chưa rõ"}
                            </div>
                          )}
                          
                          <div className="flex gap-1.5 mb-3 flex-wrap">
                            {item.service_type && <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${getServiceBadgeStyle(item.service_type)}`}>{item.service_type}</span>}
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${getPriorityStyle(item.priority || null)}`}>{item.priority || "Trung bình"}</span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className={`text-xs flex items-center gap-1 font-medium ${warn ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              <Clock size={12} /> {formatDate(item.due_date)}
                            </div>
                            {item.total_amount && <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatVND(item.total_amount)}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}

          {/* VIEW: CALENDAR */}
          {viewMode === "calendar" && (
            <div className="p-4 md:p-6 bg-white dark:bg-slate-800 h-[600px]">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                views={['month', 'week', 'agenda']}
                messages={{ next: "Tiếp", previous: "Trước", today: "Hôm nay", month: "Tháng", week: "Tuần", day: "Ngày", agenda: "Lịch trình" }}
                onSelectEvent={(event) => router.push(`/project/${event.id}`)}
                eventPropGetter={(event: Event) => {
                  const status = (event.resource as HoSo).status;
                  const warn = isWarning((event.resource as HoSo).due_date, status);
                  let bg = "#3b82f6"; // blue
                  if (status === "Hoàn thành") bg = "#10b981"; // green
                  else if (warn) bg = "#ef4444"; // red
                  else if (status === "Đang chờ") bg = "#f59e0b"; // yellow
                  return { style: { backgroundColor: bg, border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 600, padding: "2px 6px" } };
                }}
                className="font-sans dark:text-slate-300 dark:[&_.rbc-off-range-bg]:bg-slate-800/50 dark:[&_.rbc-today]:bg-slate-700/50"
              />
            </div>
          )}

        </div>
      </main>

      {/* ─── ADD NEW RECORD MODAL ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => { setIsAddModalOpen(false); resetForm(); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingProject ? "Chỉnh sửa hồ sơ" : "Thêm hồ sơ mới"}
              </span>
              <button onClick={() => { setIsAddModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Tên KH *</label><input type="text" placeholder="CÔNG TY..." value={tenKhach} onChange={e=>setTenKhach(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Số điện thoại</label><input type="text" placeholder="090..." value={soDienThoai} onChange={e=>setSoDienThoai(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Dịch vụ</label><input type="text" placeholder="Loại..." value={dichVu} onChange={e=>setDichVu(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Người GT</label><input type="text" placeholder="Tên..." value={nguoiGioiThieu} onChange={e=>setNguoiGioiThieu(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Giá trị (đ)</label><input type="number" placeholder="1000000" value={soTien} onChange={e=>setSoTien(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Hạn chót</label><input type="date" value={hanChot} onChange={e=>setHanChot(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100" /></div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Ưu tiên</label>
                <select value={doUuTien} onChange={e=>setDoUuTien(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors dark:text-slate-100 [&>option]:bg-white dark:[&>option]:bg-slate-800">
                  <option value="Thường">Thường (Xanh)</option>
                  <option value="Trung bình">Trung bình (Vàng)</option>
                  <option value="Gấp">Gấp (Đỏ)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => { setIsAddModalOpen(false); resetForm(); }} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Hủy</button>
              <button onClick={editingProject ? handleEdit : handleAdd} disabled={adding} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg disabled:opacity-50 transition-colors">
                {adding ? "Đang lưu..." : (editingProject ? "Lưu thay đổi" : "Thêm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}