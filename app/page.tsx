"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Briefcase, Wallet, Clock, Search, Plus, Trash2,
  Scale, TrendingUp, AlertCircle, Eye, LogOut, 
  Download, Filter, Calendar, LayoutGrid, List
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { logActivity } from "@/lib/logger";

/* ─── Types ─────────────────────────────────────────── */
interface HoSo {
  id: string | number;
  customer_name: string;
  service_type: string | null;
  partner_name: string | null;
  status: string | null;
  total_amount: number | null;
  created_at: string | null;
  due_date: string | null;
}

/* ─── Status config ─────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: "Đang chờ",   label: "Đang chờ",   bg: "#fffbeb", color: "#b45309", border: "#fcd34d" },
  { value: "Đang soạn",  label: "Đang soạn",  bg: "#eff6ff", color: "#1d4ed8", border: "#93c5fd" },
  { value: "Đang nộp",   label: "Đang nộp",   bg: "#f0f9ff", color: "#0369a1", border: "#7dd3fc" },
  { value: "Hoàn thành", label: "Hoàn thành", bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
];
function getStatus(val: string | null) {
  return STATUS_OPTIONS.find(s => s.value === val) ?? { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", label: val ?? "—" };
}

/* ─── Helpers ───────────────────────────────────────── */
function formatVND(n: number) { return n.toLocaleString("vi-VN") + "đ"; }
function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

// Hàm xuất CSV
function downloadCSV(data: HoSo[]) {
  if (data.length === 0) return toast.info("Không có dữ liệu để xuất");
  const headers = ["Khách hàng", "Dịch vụ", "Người giới thiệu", "Trạng thái", "Phí dịch vụ", "Ngày tạo", "Hạn chót"];
  const rows = data.map(item => [
    `"${item.customer_name || ""}"`,
    `"${item.service_type || ""}"`,
    `"${item.partner_name || ""}"`,
    `"${item.status || ""}"`,
    item.total_amount || 0,
    `"${formatDate(item.created_at)}"`,
    `"${formatDate(item.due_date)}"`
  ]);
  const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); // \uFEFF for Excel UTF-8 BOM
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
function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: string | number; icon: React.ElementType; accent: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: "14px", border: `1px solid #e2e8f0`, borderLeft: `4px solid ${accent}`,
      padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
    }}>
      <div style={{ width: 48, height: 48, borderRadius: "12px", background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={22} color={accent} strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{value}</div>
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

  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  /* form state */
  const [tenKhach, setTenKhach]               = useState("");
  const [dichVu, setDichVu]                   = useState("");
  const [nguoiGioiThieu, setNguoiGioiThieu]   = useState("");
  const [soTien, setSoTien]                   = useState("");
  const [hanChot, setHanChot]                 = useState("");

  /* filter state */
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPartner, setFilterPartner]= useState("");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");

  /* fetch */
  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (error) { console.error(error); setError(error.message); }
    else { setHoso(data ?? []); setError(null); }
    setLoading(false);
  }
  useEffect(() => { fetchData(); }, []);

  /* add */
  async function handleAdd() {
    if (!tenKhach.trim()) { toast.warning("Vui lòng nhập tên khách hàng"); return; }
    setAdding(true);
    const { error } = await supabase.from("projects").insert([{
      customer_name: tenKhach.trim(), service_type: dichVu.trim() || null, partner_name: nguoiGioiThieu.trim() || null,
      total_amount: soTien ? Number(soTien) : null, due_date: hanChot || null,
    }]);
    if (error) {
      if (error.code === "42703") toast.error("Lỗi Database", { description: "Cột 'due_date' chưa được thêm vào bảng projects. Hãy chạy mã SQL!" });
      else toast.error("Lỗi khi thêm hồ sơ", { description: error.message });
    } else { 
      toast.success("Thêm hồ sơ thành công!");
      if (user && profile) await logActivity(user.id, profile.display_name || "Nhân viên", "đã thêm hồ sơ mới", tenKhach.trim());
      setTenKhach(""); setDichVu(""); setNguoiGioiThieu(""); setSoTien(""); setHanChot("");
      await fetchData(); 
    }
    setAdding(false);
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
    const { error } = await supabase.from("projects").update({ status: val }).eq("id", id);
    if (error) toast.error("Lỗi cập nhật trạng thái", { description: error.message });
    else {
      toast.success("Đã cập nhật trạng thái thành: " + val);
      if (user && profile) await logActivity(user.id, profile.display_name || "Nhân viên", "đã cập nhật trạng thái thành " + val, "Hồ sơ ID: " + id);
      setHoso(prev => prev.map(h => h.id === id ? { ...h, status: val } : h));
    }
  }



  /* computed filters */
  const filtered = useMemo(() => {
    return hoso.filter(h => {
      if (search && !h.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && h.status !== filterStatus) return false;
      if (filterPartner && h.partner_name !== filterPartner) return false;
      if (dateFrom || dateTo) {
        if (!h.created_at) return false;
        const d = new Date(h.created_at).getTime();
        if (dateFrom && d < new Date(dateFrom).getTime()) return false;
        if (dateTo && d > new Date(dateTo).getTime() + 86400000) return false;
      }
      return true;
    });
  }, [hoso, search, filterStatus, filterPartner, dateFrom, dateTo]);

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

  /* Check deadline */
  const isWarning = (dueDate: string | null, status: string | null) => {
    if (!dueDate || status === "Hoàn thành") return false;
    const today = new Date().getTime();
    const due = new Date(dueDate).getTime();
    return (due - today) < 259200000;
  };

  /* ── Render ── */
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      <Header title="GSLaw Flow" showActions={true} />

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── STAT CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          <StatCard label="Tổng hồ sơ hiển thị" value={filtered.length}          icon={Briefcase}  accent="#1d4ed8" />
          <StatCard label="Đang xử lý"        value={dangXuLy}             icon={Clock}      accent="#d97706" />
          {isAdmin && <StatCard label="Doanh thu dự kiến" value={formatVND(totalDoanhThu)} icon={Wallet} accent="#059669" />}
          <StatCard label="Hoàn thành"        value={filtered.filter(h=>h.status==="Hoàn thành").length} icon={TrendingUp} accent="#7c3aed" />
        </div>

        {/* ── ADD FORM & CHARTS ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24, alignItems: "start" }}>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={16} color="#1d4ed8" /> Thêm hồ sơ mới
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
              <div><label style={labelStyle}>Tên KH *</label><input type="text" placeholder="CÔNG TY..." value={tenKhach} onChange={e=>setTenKhach(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Dịch vụ</label><input type="text" placeholder="Loại..." value={dichVu} onChange={e=>setDichVu(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Người GT</label><input type="text" placeholder="Tên..." value={nguoiGioiThieu} onChange={e=>setNguoiGioiThieu(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Phí (đ)</label><input type="number" placeholder="1000000" value={soTien} onChange={e=>setSoTien(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Hạn chót</label><input type="date" value={hanChot} onChange={e=>setHanChot(e.target.value)} style={inputStyle} /></div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={handleAdd} disabled={adding} style={{
                  width: "100%", padding: "9px 0", fontSize: 13, fontWeight: 700, background: adding ? "#93c5fd" : "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "#fff",
                  border: "none", borderRadius: 8, cursor: adding ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 2px 8px rgba(29,78,216,.25)", transition: "opacity .15s"
                }}><Plus size={15} /> Thêm</button>
              </div>
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", height: "100%" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>Thống kê Trạng thái</div>
            {chartData.length > 0 ? (
              <div style={{ height: 180, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><RechartsTooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /></PieChart>
                </ResponsiveContainer>
              </div>
            ) : <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 40 }}>Không có dữ liệu</div>}
          </div>
        </div>

        {/* ── CONTENT VIEW (TABLE OR KANBAN) ── */}
        <div style={{ background: viewMode === "table" ? "#fff" : "transparent", borderRadius: viewMode === "table" ? 14 : 0, border: viewMode === "table" ? "1px solid #e2e8f0" : "none", boxShadow: viewMode === "table" ? "0 1px 4px rgba(0,0,0,.06)" : "none", overflow: "hidden" }}>
          
          {/* Bộ lọc nâng cao & Toggle View */}
          <div style={{ padding: "16px 20px", borderBottom: viewMode === "table" ? "1px solid #f1f5f9" : "none", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", background: viewMode === "table" ? "#f8fafc" : "transparent", borderRadius: viewMode === "kanban" ? 14 : 0 }}>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <Search size={16} color="#94a3b8" />
              <input placeholder="Tìm Tên khách hàng..." value={search} onChange={e=>setSearch(e.target.value)} style={{ border: "none", outline: "none", fontSize: 13, width: "100%", background: "transparent" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Filter size={16} color="#64748b" />
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={selectStyle}>
                <option value="">Tất cả Trạng thái</option>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={filterPartner} onChange={e=>setFilterPartner(e.target.value)} style={selectStyle}>
                <option value="">Tất cả Nguồn GT</option>
                {uniquePartners.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 8px" }}>
                <Calendar size={14} color="#64748b" />
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ border: "none", outline: "none", fontSize: 12 }} title="Từ ngày" />
                <span style={{ color: "#94a3b8" }}>-</span>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ border: "none", outline: "none", fontSize: 12 }} title="Đến ngày" />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, borderLeft: "1px solid #cbd5e1", paddingLeft: 16 }}>
              <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 8, padding: 4 }}>
                <button onClick={() => setViewMode("table")} style={{ ...toggleBtnStyle, background: viewMode === "table" ? "#fff" : "transparent", color: viewMode === "table" ? "#0f172a" : "#64748b", boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  <List size={16} /> Bảng
                </button>
                <button onClick={() => setViewMode("kanban")} style={{ ...toggleBtnStyle, background: viewMode === "kanban" ? "#fff" : "transparent", color: viewMode === "kanban" ? "#0f172a" : "#64748b", boxShadow: viewMode === "kanban" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  <LayoutGrid size={16} /> Kanban
                </button>
              </div>
              <button onClick={() => downloadCSV(filtered)} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "all 0.15s" }}>
                <Download size={16} /> Xuất CSV
              </button>
            </div>
          </div>

          {/* VIEW: TABLE */}
          {viewMode === "table" && (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#fff" }}>
                      {["Khách hàng", "Dịch vụ", "Nguồn", "Ngày tạo", "Hạn chót", "Trạng thái", "Phí", "Thao tác"].map(h => (
                        <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? <tr><td colSpan={8} style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>Đang tải dữ liệu...</td></tr> : filtered.length === 0 ? <tr><td colSpan={8} style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>Không tìm thấy hồ sơ phù hợp</td></tr> : filtered.map((item, idx) => {
                      const s = getStatus(item.status);
                      const warn = isWarning(item.due_date, item.status);
                      return (
                        <tr key={item.id} onClick={() => router.push(`/project/${item.id}`)} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none", background: warn ? "#fef2f2" : "transparent", cursor: "pointer", transition: "background .15s" }} onMouseEnter={e => { if(!warn) e.currentTarget.style.background = "#f8fafc"; }} onMouseLeave={e => { if(!warn) e.currentTarget.style.background = "transparent"; }}>
                          <td style={{ padding: "13px 16px", fontWeight: 600, color: "#0f172a" }}>{item.customer_name}</td>
                          <td style={{ padding: "13px 16px", color: "#475569" }}>{item.service_type ?? "—"}</td>
                          <td style={{ padding: "13px 16px", color: "#475569" }}>{item.partner_name ?? "—"}</td>
                          <td style={{ padding: "13px 16px", color: "#94a3b8", whiteSpace: "nowrap" }}>{formatDate(item.created_at)}</td>
                          <td style={{ padding: "13px 16px", color: warn ? "#dc2626" : "#64748b", whiteSpace: "nowrap", fontWeight: warn ? 700 : 400 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{formatDate(item.due_date)}{warn && <AlertCircle size={14} color="#dc2626" />}</div>
                          </td>
                          <td style={{ padding: "13px 16px" }} onClick={e => e.stopPropagation()}>
                            <select value={item.status ?? ""} onChange={e => handleStatus(item.id, e.target.value)} style={{ background: s.bg, color: s.color, border: `1.5px solid ${s.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none" }}>
                              <option value="" disabled>— Chọn —</option>
                              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "13px 16px", textAlign: "right", fontWeight: 600, color: "#059669", whiteSpace: "nowrap" }}>{item.total_amount ? formatVND(Number(item.total_amount)) : "—"}</td>
                          <td style={{ padding: "13px 16px", textAlign: "center", display: "flex", gap: 8, justifyContent: "center" }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => router.push(`/project/${item.id}`)} title="Xem" style={btnStyle("#eff6ff", "#bfdbfe", "#1d4ed8")}><Eye size={13} /></button>
                            {isAdmin && <button onClick={() => handleDelete(item.id, item.customer_name)} title="Xóa" style={btnStyle("#fff1f2", "#fecdd3", "#e11d48")}><Trash2 size={13} /></button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "10px 20px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8", textAlign: "right" }}>Hiển thị {filtered.length} hồ sơ</div>
            </>
          )}

          {/* VIEW: KANBAN */}
          {viewMode === "kanban" && (
            <div style={{ display: "flex", gap: 16, overflowX: "auto", padding: "16px 0 32px 0", alignItems: "flex-start" }}>
              {STATUS_OPTIONS.map(col => {
                const colItems = filtered.filter(h => (h.status === col.value) || (!h.status && col.value === "Đang chờ"));
                return (
                  <div key={col.value} style={{ flexShrink: 0, width: 300, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: 12, display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{col.label}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", background: "#e2e8f0", padding: "2px 8px", borderRadius: 12 }}>{colItems.length}</span>
                    </div>

                    {colItems.map(item => {
                      const warn = isWarning(item.due_date, item.status);
                      return (
                        <div key={item.id} onClick={() => router.push(`/project/${item.id}`)} style={{
                          background: "#fff", borderRadius: 10, border: warn ? "1px solid #fca5a5" : "1px solid #e2e8f0", padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer", transition: "transform 0.15s", position: "relative"
                        }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                          {warn && <div style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}><AlertCircle size={12}/></div>}
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 8, wordBreak: "break-word" }}>{item.customer_name}</div>
                          <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>{item.service_type || "—"}</div>
                          
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                            <div style={{ fontSize: 11, color: warn ? "#dc2626" : "#64748b", display: "flex", alignItems: "center", gap: 4, fontWeight: warn ? 600 : 400 }}>
                              <Clock size={12} /> {formatDate(item.due_date)}
                            </div>
                            {item.total_amount && <div style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>{formatVND(item.total_amount)}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @media (max-width: 900px) { main > div:nth-child(2) { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".5px" };
const inputStyle = { width: "100%", padding: "8px 12px", fontSize: 13, border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none", color: "#0f172a", transition: "border-color .15s" };
const selectStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none", color: "#0f172a" };
const btnStyle = (bg: string, border: string, color: string) => ({ background: bg, border: `1px solid ${border}`, color: color, borderRadius: 8, padding: "5px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 });
const toggleBtnStyle = { border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "all 0.2s" };