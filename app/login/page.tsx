"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Scale, Lock, Mail, Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Đăng nhập thất bại", { description: error.message });
      } else {
        toast.success("Đăng nhập thành công!");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error("Đăng ký thất bại", { description: error.message });
      } else {
        toast.success("Đăng ký thành công!", { description: "Vui lòng kiểm tra email để xác thực tài khoản (nếu được yêu cầu)." });
        // Automatically switch to login state after sign up
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, #0f2044 0%, #1e3a6e 100%)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 4px 12px rgba(15,32,68,0.2)" }}>
            <Scale size={28} color="#60a5fa" strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>GSLaw Flow</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Hệ thống quản lý hồ sơ nội bộ</p>
        </div>

        {/* Form Card */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 24, textAlign: "center" }}>
            {isLogin ? "Đăng nhập hệ thống" : "Tạo tài khoản mới"}
          </h2>

          <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gslaw.vn"
                  style={{
                    width: "100%", padding: "10px 12px 10px 36px", fontSize: 14,
                    border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none",
                    color: "#0f172a", transition: "border-color .15s", boxSizing: "border-box"
                  }}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Mật khẩu</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%", padding: "10px 12px 10px 36px", fontSize: 14,
                    border: "1.5px solid #e2e8f0", borderRadius: 8, outline: "none",
                    color: "#0f172a", transition: "border-color .15s", boxSizing: "border-box"
                  }}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: "100%", padding: "12px", fontSize: 14, fontWeight: 600,
                background: (loading || !email || !password) ? "#93c5fd" : "#1d4ed8",
                color: "#fff", border: "none", borderRadius: 8, marginTop: 8,
                cursor: (loading || !email || !password) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background .15s"
              }}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Đang xử lý...</>
              ) : isLogin ? (
                <><LogIn size={16} /> Đăng nhập</>
              ) : (
                <><UserPlus size={16} /> Đăng ký</>
              )}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#64748b" }}>
            {isLogin ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              style={{ 
                background: "none", border: "none", color: "#1d4ed8", fontWeight: 600, 
                cursor: "pointer", padding: 0 
              }}
            >
              {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
            </button>
          </div>
        </div>
        
        {/* Footer text */}
        <div style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: "#94a3b8" }}>
          Bảo mật bởi Supabase Auth
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
