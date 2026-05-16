"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function GSLawDashboard() {
  const [hoso, setHoso] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Input state
  const [tenKhach, setTenKhach] = useState("");
  const [dichVu, setDichVu] = useState("");
  const [nguoiGioiThieu, setNguoiGioiThieu] = useState("");
  const [soTien, setSoTien] = useState("");

  // Lấy dữ liệu từ Supabase
  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Lỗi lấy dữ liệu:", error);
      setError(error.message);
    } else {
      setHoso(data || []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  // Thêm hồ sơ mới
  async function handleAdd() {
    if (!tenKhach.trim()) return alert("Vui lòng nhập tên khách hàng");

    setAdding(true);
    const { error } = await supabase
      .from("projects")
      .insert([{
        customer_name: tenKhach.trim(),
        service_type: dichVu.trim(),
        partner_name: nguoiGioiThieu.trim() || null,
        total_amount: soTien ? Number(soTien) : null,
      }]);

    if (error) {
      alert("Lỗi khi thêm: " + error.message);
    } else {
      setTenKhach("");
      setDichVu("");
      setNguoiGioiThieu("");
      setSoTien("");
      await fetchData();
    }
    setAdding(false);
  }

  // Màu sắc trạng thái
  const STATUS_OPTIONS = [
    { label: "Đang chờ",   value: "Đang chờ",   bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
    { label: "Đang nộp",   value: "Đang nộp",   bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    { label: "Hoàn thành", value: "Hoàn thành", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  ];

  function getStatusStyle(status: string) {
    return STATUS_OPTIONS.find(s => s.value === status) ?? { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  }

  // Cập nhật trạng thái lên Supabase
  async function handleUpdateStatus(id: string | number, newStatus: string) {
    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Lỗi cập nhật trạng thái: " + error.message);
    } else {
      // Cập nhật local ngay lập tức không cần fetch lại
      setHoso(prev => prev.map(h => h.id === id ? { ...h, status: newStatus } : h));
    }
  }

  // Xóa hồ sơ
  async function handleDelete(id: string | number, tenKhach: string) {
    if (!confirm(`Bạn có chắc muốn xóa hồ sơ "${tenKhach}" không?\nHành động này không thể hoàn tác.`)) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Lỗi khi xóa: " + error.message);
    } else {
      await fetchData();
    }
  }

  // Tính tổng doanh thu
  const totalDoanhThu = hoso.reduce((sum, h) => sum + (Number(h.total_amount) || 0), 0);
  const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <h1 className="text-3xl font-bold text-blue-800 mb-8">Hệ thống Quản lý GSLaw</h1>

      {/* THỐNG KÊ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Tổng hồ sơ</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{hoso.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Đang xử lý</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {hoso.filter(h => h.status !== "Hoàn thành").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Doanh thu dự kiến</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatVND(totalDoanhThu)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FORM THÊM HỒ SƠ */}
      <Card className="mb-8 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Thêm hồ sơ mới</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>Tên khách hàng *</label>
              <Input
                placeholder="CÔNG TY TNHH..."
                value={tenKhach}
                onChange={(e) => setTenKhach(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>Loại dịch vụ</label>
              <Input
                placeholder="Thay đổi địa chỉ, Tăng vốn..."
                value={dichVu}
                onChange={(e) => setDichVu(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>Người giới thiệu</label>
              <Input
                placeholder="C. Hoài, C. Hằng..."
                value={nguoiGioiThieu}
                onChange={(e) => setNguoiGioiThieu(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>Số tiền phí (đ)</label>
              <Input
                type="number"
                placeholder="1200000"
                value={soTien}
                onChange={(e) => setSoTien(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <Button onClick={handleAdd} disabled={adding} style={{ width: "100%" }}>
                {adding ? "Đang thêm..." : "➕ Thêm hồ sơ"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LỖI KẾT NỐI */}
      {error && (
        <div style={{
          background: "#fee2e2", border: "1px solid #dc2626",
          borderRadius: "8px", padding: "12px 16px", marginBottom: "16px",
          color: "#991b1b", fontFamily: "monospace", fontSize: "13px"
        }}>
          ❌ Lỗi kết nối Supabase: {error}
        </div>
      )}

      {/* BẢNG DANH SÁCH */}
      <div className="bg-white rounded-xl shadow-sm border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Dịch vụ</TableHead>
              <TableHead>Người giới thiệu</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Phí</TableHead>
              <TableHead style={{ width: "90px", textAlign: "center" }}>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                  Đang tải dữ liệu...
                </TableCell>
              </TableRow>
            ) : hoso.length > 0 ? (
              hoso.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.customer_name}</TableCell>
                  <TableCell>{item.service_type}</TableCell>
                  <TableCell>{item.partner_name ?? "—"}</TableCell>
                  <TableCell>
                    {(() => {
                      const s = getStatusStyle(item.status);
                      return (
                        <select
                          value={item.status ?? ""}
                          onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                          style={{
                            background: s.bg,
                            color: s.color,
                            border: `1.5px solid ${s.border}`,
                            borderRadius: "20px",
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            outline: "none",
                            appearance: "auto",
                          }}
                        >
                          <option value="" disabled>— Chọn —</option>
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.total_amount ? Number(item.total_amount).toLocaleString() + "đ" : "—"}
                  </TableCell>
                  <TableCell style={{ textAlign: "center" }}>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(item.id, item.customer_name)}
                      style={{ padding: "4px 12px", fontSize: "12px" }}
                    >
                      🗑 Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                  Chưa có dữ liệu. Dùng form phía trên để thêm hồ sơ đầu tiên!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}