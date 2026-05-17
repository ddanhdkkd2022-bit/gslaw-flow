"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import Header from "@/components/Header";
import { toast } from "sonner";
import { logActivity } from "@/lib/logger";

export default function SettingsPage() {
  const { profile, isAdmin, user } = useAuth();
  
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name || "");
    
    const fetchSettings = async () => {
      const { data, error } = await supabase.from("settings").select("*").limit(1).single();
      if (data) {
        setCompanyName(data.company_name || "");
        setCompanyAddress(data.company_address || "");
        setTaxId(data.tax_id || "");
      }
      setLoadingSettings(false);
    };
    fetchSettings();
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", profile.id);
    if (error) toast.error("Lỗi cập nhật", { description: error.message });
    else {
      toast.success("Đã cập nhật Tên hiển thị");
      if (user) await logActivity(user.id, displayName, "đã cập nhật", "Tên hiển thị");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (!password) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error("Lỗi đổi mật khẩu", { description: error.message });
    else {
      toast.success("Đã đổi mật khẩu thành công!");
      setPassword("");
    }
    setLoading(false);
  };

  const handleUpdateSettings = async () => {
    if (!isAdmin) return;
    setLoading(true);
    
    // Check if settings row exists
    const { data } = await supabase.from("settings").select("id").limit(1);
    
    let error;
    if (data && data.length > 0) {
      const res = await supabase.from("settings").update({ company_name: companyName, company_address: companyAddress, tax_id: taxId }).eq("id", data[0].id);
      error = res.error;
    } else {
      const res = await supabase.from("settings").insert([{ company_name: companyName, company_address: companyAddress, tax_id: taxId }]);
      error = res.error;
    }
    
    if (error) {
      if (error.code === "42P01") toast.error("Lỗi", { description: "Chưa tạo bảng settings. Hãy chạy SQL." });
      else toast.error("Lỗi cập nhật", { description: error.message });
    } else {
      toast.success("Đã cập nhật thông tin Công ty!");
      if (user && profile) await logActivity(user.id, profile.display_name || "Admin", "đã cập nhật", "Thông tin Công ty");
    }
    
    setLoading(false);
  };

  if (!profile) return <div/>;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <Header title="Cài đặt Hệ thống" showActions={true} />
      
      <main style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Profile Settings */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>Tài khoản cá nhân</h2>
          
          <div style={{ display: "grid", gap: 16, maxWidth: 400 }}>
            <div>
              <label style={labelStyle}>Tên hiển thị</label>
              <input type="text" value={displayName} onChange={e=>setDisplayName(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={handleUpdateProfile} disabled={loading} style={btnStyle}>Cập nhật Tên</button>
            
            <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "8px 0" }} />
            
            <div>
              <label style={labelStyle}>Mật khẩu mới</label>
              <input type="password" placeholder="Nhập mật khẩu mới..." value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={handleUpdatePassword} disabled={loading || !password} style={btnStyle}>Đổi mật khẩu</button>
          </div>
        </div>

        {/* Company Settings (Admin only) */}
        {isAdmin && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>Thông tin Văn phòng / Công ty</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Thông tin này sẽ được in trên đầu các bản báo cáo PDF.</p>
            
            {loadingSettings ? <div style={{ fontSize: 13, color: "#94a3b8" }}>Đang tải...</div> : (
              <div style={{ display: "grid", gap: 16, maxWidth: 500 }}>
                <div>
                  <label style={labelStyle}>Tên Công ty / Văn phòng</label>
                  <input type="text" placeholder="Công ty Luật GSLaw..." value={companyName} onChange={e=>setCompanyName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Địa chỉ</label>
                  <input type="text" placeholder="Tầng 5, Tòa nhà..." value={companyAddress} onChange={e=>setCompanyAddress(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mã số thuế</label>
                  <input type="text" placeholder="0123456789" value={taxId} onChange={e=>setTaxId(e.target.value)} style={inputStyle} />
                </div>
                
                <button onClick={handleUpdateSettings} disabled={loading} style={btnStyle}>Lưu thông tin Công ty</button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 };
const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none", color: "#0f172a", transition: "border-color .15s" };
const btnStyle = { background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer", alignSelf: "flex-start" };
