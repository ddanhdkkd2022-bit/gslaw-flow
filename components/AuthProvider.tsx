"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  role: "admin" | "staff";
  display_name: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType>({ user: null, profile: null, isAdmin: false });
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;

    const handleAuth = async (session: any) => {
      try {
        if (session) {
          setIsAuthenticated(true);
          setUser(session.user);
          
          const userId = session.user.id;
          const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
          
          if (active) {
            if (data) {
              setProfile(data);
            } else {
              const newProfile = { id: userId, role: "staff" as const, display_name: "Nhân viên mới" };
              await supabase.from("profiles").upsert([newProfile]);
              setProfile(newProfile);
            }
            if (pathname === "/login") {
              router.replace("/");
            }
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setProfile(null);
          if (active && pathname !== "/login" && !pathname.startsWith("/tracking")) {
            router.replace("/login");
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      await handleAuth(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
        <div style={{ width: 24, height: 24, border: "3px solid #bfdbfe", borderTop: "3px solid #1d4ed8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== "/login" && !pathname.startsWith("/tracking")) {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin: profile?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}
