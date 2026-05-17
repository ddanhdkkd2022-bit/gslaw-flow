"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Briefcase, Wallet, Clock, Search, Plus, Trash2,
  Scale, TrendingUp, AlertCircle, Eye, LogOut
} from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────── */
interface HoSo {
  id: string | number;
  customer_name: string;
  service_type: string | null;
  partner_name: string | null;
  status: string | null;
  total_amount: number | null;
  created_at: string | null;
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

/* ─── Stat Card ─────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: string | number; icon: React.ElementType; accent: string;
}) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: "14px",
      border: `1px solid #e2e8f0`,
      borderLeft: `4px solid ${accent}`,
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      boxShadow: "0 1px 4px rgba(0,0,0,.06)",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "12px",
        background: accent + "18",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
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
  const [hoso, setHoso]       = useState<HoSo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [adding, setAdding]   = useState(false);
  const [search, setSearch]   = useState("");
  const router = useRouter();

  /* form */
  const [tenKhach, setTenKhach]               = useState("");
  const [dichVu, setDichVu]                   = useState("");
  const [nguoiGioiThieu, setNguoiGioiThieu]   = useState("");
  const [soTien, setSoTien]                   = useState("");

  /* fetch */
  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects").select("*").order("created_at", { ascending: false });
    if (error) { console.error(error); setError(error.message); }
    else { setHoso(data ?? []); setError(null); }
    setLoading(false);
  }
  useEffect(() => { fetchData(); }, []);

  /* add */
  async function handleAdd() {
    if (!tenKhach.trim()) {
      toast.warning("Vui lòng nhập tên khách hàng");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("projects").insert([{
      customer_name: tenKhach.trim(),
      service_type:  dichVu.trim() || null,
      partner_name:  nguoiGioiThieu.trim() || null,
      total_amount:  soTien ? Number(soTien) : null,
    }]);
    if (error) {
      toast.error("Lỗi khi thêm hồ sơ", { description: error.message });
    } else { 
      toast.success("Thêm hồ sơ thành công!");
      setTenKhach(""); setDichVu(""); setNguoiGioiThieu(""); setSoTien(""); 
      await fetchData(); 
    }
    setAdding(false);
  }

  /* delete */
  async function handleDelete(id: string | number, name: string) {
    if (!confirm(`Xóa hồ sơ "${name}"?\nHành động này không thể hoàn tác.`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("Lỗi khi xóa", { description: error.message });
    } else {
      toast.success("Đã xóa hồ sơ " + name);
      await fetchData();
    }
  }

  /* status update */
  async function handleStatus(id: string | number, val: string) {
    const { error } = await supabase.from("projects").update({ status: val }).eq("id", id);
    if (error) {
      toast.error("Lỗi cập nhật trạng thái", { description: error.message });
    } else {
      toast.success("Đã cập nhật trạng thái thành: " + val);
      setHoso(prev => prev.map(h => h.id === id ? { ...h, status: val } : h));
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info("Đã đăng xuất");
  };

  /* computed */
  const totalDoanhThu = hoso.reduce((s, h) => s + (Number(h.total_amount) || 0), 0);
  const dangXuLy      = hoso.filter(h => h.status !== "Hoàn thành").length;
  const filtered      = useMemo(() =>
    hoso.filter(h => h.customer_name?.toLowerCase().includes(search.toLowerCase())),
    [hoso, search]
  );

  /* ── Render ── */
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{
        background: "linear-gradient(135deg, #0f2044 0%, #1e3a6e 100%)",
        padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 64,
        boxShadow: "0 2px 12px rgba(0,0,0,.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Scale size={24} color="#60a5fa" strokeWidth={2} />
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: ".3px" }}>
            GSLaw Flow
          </span>
          <span style={{ fontSize: 13, color: "#93c5fd", marginLeft: 4, display: "none" }}>— Hệ thống Quản lý Hồ sơ</span>
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

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── STAT CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 28 }}>
          <StatCard label="Tổng hồ sơ"       value={hoso.length}          icon={Briefcase}  accent="#1d4ed8" />
          <StatCard label="Đang xử lý"        value={dangXuLy}             icon={Clock}      accent="#d97706" />
          <StatCard label="Doanh thu dự kiến" value={formatVND(totalDoanhThu)} icon={Wallet} accent="#059669" />
          <StatCard label="Hoàn thành"        value={hoso.filter(h=>h.status==="Hoàn thành").length} icon={TrendingUp} accent="#7c3aed" />
        </div>

        {/* ── ADD FORM ── */}
        <div style={{
          background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
          padding: "20px 24px", marginBottom: 24,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={16} color="#1d4ed8" /> Thêm hồ sơ mới
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
            {[
              { label: "Tên khách hàng *", val: tenKhach, set: setTenKhach, ph: "CÔNG TY TNHH...", type: "text" },
              { label: "Dịch vụ",          val: dichVu,   set: setDichVu,   ph: "Thay đổi địa chỉ...", type: "text" },
              { label: "Người giới thiệu", val: nguoiGioiThieu, set: setNguoiGioiThieu, ph: "C. Hoài...", type: "text" },
              { label: "Số tiền phí (đ)",  val: soTien,   set: setSoTien,   ph: "1200000", type: "number" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.ph}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  style={{
                    width: "100%", padding: "8px 12px", fontSize: 13,
                    border: "1.5px solid #e2e8f0", borderRadius: 8,
                    outline: "none", boxSizing: "border-box", color: "#0f172a",
                    transition: "border-color .15s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={handleAdd}
                disabled={adding}
                style={{
                  width: "100%", padding: "9px 0", fontSize: 13, fontWeight: 700,
                  background: adding ? "#93c5fd" : "linear-gradient(135deg,#1d4ed8,#2563eb)",
                  color: "#fff", border: "none", borderRadius: 8,
                  cursor: adding ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  boxShadow: "0 2px 8px rgba(29,78,216,.25)",
                  transition: "opacity .15s",
                }}
              >
                <Plus size={15} /> {adding ? "Đang thêm..." : "Thêm hồ sơ"}
              </button>
            </div>
          </div>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10,
            padding: "12px 16px", marginBottom: 16, color: "#b91c1c",
            fontSize: 13, display: "flex", alignItems: "center", gap: 8,
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ── TABLE CARD ── */}
        <div style={{
          background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden",
        }}>

          {/* search bar */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
            <Search size={16} color="#94a3b8" />
            <input
              placeholder="Tìm theo tên khách hàng..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: "none", outline: "none", fontSize: 14, width: "100%",
                color: "#0f172a", background: "transparent",
              }}
            />
            {search && (
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} kết quả</span>
            )}
          </div>

          {/* table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Khách hàng", "Dịch vụ", "Người giới thiệu", "Ngày tạo", "Trạng thái", "Phí", "Thao tác"].map(h => (
                    <th key={h} style={{
                      padding: "11px 16px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, color: "#64748b",
                      textTransform: "uppercase", letterSpacing: ".5px",
                      borderBottom: "1px solid #e2e8f0",
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <div style={{
                        width: 20, height: 20, border: "2px solid #e2e8f0",
                        borderTop: "2px solid #1d4ed8", borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }} />
                      Đang tải dữ liệu...
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: 14 }}>
                    {search ? `Không tìm thấy "${search}"` : "Chưa có hồ sơ. Dùng form trên để thêm!"}
                  </td></tr>
                ) : (
                  filtered.map((item, idx) => {
                    const s = getStatus(item.status);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => router.push(`/project/${item.id}`)}
                        style={{
                          borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
                          transition: "background .15s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}
                      >
                        <td style={{ padding: "13px 16px", fontWeight: 600, color: "#0f172a" }}>
                          {item.customer_name}
                        </td>
                        <td style={{ padding: "13px 16px", color: "#475569" }}>{item.service_type ?? "—"}</td>
                        <td style={{ padding: "13px 16px", color: "#475569" }}>{item.partner_name ?? "—"}</td>
                        <td style={{ padding: "13px 16px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                          {formatDate(item.created_at)}
                        </td>
                        <td style={{ padding: "13px 16px" }} onClick={e => e.stopPropagation()}>
                          <select
                            value={item.status ?? ""}
                            onChange={e => handleStatus(item.id, e.target.value)}
                            style={{
                              background: s.bg, color: s.color,
                              border: `1.5px solid ${s.border}`,
                              borderRadius: 20, padding: "3px 10px",
                              fontSize: 12, fontWeight: 600,
                              cursor: "pointer", outline: "none",
                            }}
                          >
                            <option value="" disabled>— Chọn —</option>
                            {STATUS_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "13px 16px", textAlign: "right", fontWeight: 600, color: "#059669", whiteSpace: "nowrap" }}>
                          {item.total_amount ? formatVND(Number(item.total_amount)) : "—"}
                        </td>
                        <td style={{ padding: "13px 16px", textAlign: "center", display: "flex", gap: 8, justifyContent: "center" }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/project/${item.id}`)}
                            title="Xem chi tiết"
                            style={{
                              background: "#eff6ff", border: "1px solid #bfdbfe",
                              color: "#1d4ed8", borderRadius: 8,
                              padding: "5px 10px", cursor: "pointer",
                              display: "inline-flex", alignItems: "center", gap: 4,
                              fontSize: 12, fontWeight: 600, transition: "all .15s",
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#eff6ff"; (e.currentTarget as HTMLButtonElement).style.color = "#1d4ed8"; }}
                          >
                            <Eye size={13} /> Xem
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.customer_name)}
                            title="Xóa hồ sơ"
                            style={{
                              background: "#fff1f2", border: "1px solid #fecdd3",
                              color: "#e11d48", borderRadius: 8,
                              padding: "5px 10px", cursor: "pointer",
                              display: "inline-flex", alignItems: "center", gap: 4,
                              fontSize: 12, fontWeight: 600, transition: "all .15s",
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#e11d48"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff1f2"; (e.currentTarget as HTMLButtonElement).style.color = "#e11d48"; }}
                          >
                            <Trash2 size={13} /> Xóa
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* footer */}
          {!loading && filtered.length > 0 && (
            <div style={{ padding: "10px 20px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
              Hiển thị {filtered.length}/{hoso.length} hồ sơ
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}