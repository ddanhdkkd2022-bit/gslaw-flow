"use client";
import { useState, useEffect } from "react";
import { Scale, LogOut, Bell, Settings, Activity, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "./AuthProvider";

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function Header({ 
  title = "GSLaw Flow", 
  showActions = true,
  extraLeft,
  extraRight
}: { 
  title?: string, 
  showActions?: boolean,
  extraLeft?: React.ReactNode,
  extraRight?: React.ReactNode
}) {
  const router = useRouter();
  const { profile, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNoti, setShowNoti] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!profile) return;
    const fetchNoti = async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(10);
      if (data) setNotifications(data);
    };
    fetchNoti();
  }, [profile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info("Đã đăng xuất");
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header style={{
      background: "linear-gradient(135deg, #0f2044 0%, #1e3a6e 100%)", padding: "0 32px",
      display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, boxShadow: "0 2px 12px rgba(0,0,0,.18)", position: "sticky", top: 0, zIndex: 50
    }} className="hide-on-print">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => router.push("/")}>
          <Scale size={24} color="#60a5fa" strokeWidth={2} />
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: ".3px" }}>{title}</span>
        </div>
        {extraLeft && <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16, paddingLeft: 16, borderLeft: "1px solid rgba(255,255,255,0.2)" }}>{extraLeft}</div>}
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {extraRight && <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16, paddingRight: 16, borderRight: "1px solid rgba(255,255,255,0.2)" }}>{extraRight}</div>}
        
        {showActions && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isAdmin && (
            <button aria-label="Nhật ký hệ thống" onClick={() => router.push("/logs")} title="Nhật ký hệ thống" className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 text-white border-none rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
              <Activity size={16} />
            </button>
          )}

          <div style={{ position: "relative" }}>
            <button aria-label="Thông báo" onClick={() => setShowNoti(!showNoti)} title="Thông báo" className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 text-white border-none rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
              <Bell size={16} />
              {unreadCount > 0 && <div style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", fontSize: 10, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{unreadCount}</div>}
            </button>
            {showNoti && (
              <div style={{ position: "absolute", top: 40, right: 0, background: "#fff", borderRadius: 12, width: 300, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Thông báo</div>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {notifications.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "#475569", fontSize: 13 }}>Không có thông báo mới</div> : notifications.map(n => (
                    <div key={n.id} onClick={() => markAsRead(n.id)} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", background: n.is_read ? "#fff" : "#eff6ff", cursor: "pointer" }}>
                      <div style={{ fontSize: 13, color: "#334155" }}>{n.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button aria-label="Cài đặt hệ thống" onClick={() => router.push("/settings")} title="Cài đặt" className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 text-white border-none rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
            <Settings size={16} />
          </button>
          
          <button aria-label="Đăng xuất" onClick={handleLogout} title="Đăng xuất" className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 text-white border-none rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
            <LogOut size={16} />
          </button>
          
          {mounted && (
            <button 
              aria-label="Chuyển đổi giao diện Sáng/Tối"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              title="Giao diện" 
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 text-white border-none rounded-lg cursor-pointer hover:bg-white/20 transition-colors"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          
          {profile && <div style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: "#bfdbfe" }}>Hi, {profile.display_name}</div>}
        </div>
      )}
      </div>
    </header>
  );
}

const btnNavStyle = {
  background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px 12px", borderRadius: 8, 
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", transition: "background 0.2s"
};
