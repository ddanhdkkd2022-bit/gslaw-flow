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

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
    } else {
      // If profile doesn't exist (new user), create a default 'staff' profile
      const newProfile = { id: userId, role: "staff" as const, display_name: "Nhân viên mới" };
      await supabase.from("profiles").insert([newProfile]);
      setProfile(newProfile);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        setUser(session.user);
        await fetchProfile(session.user.id);
        if (pathname === "/login") router.replace("/");
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        if (pathname !== "/login" && !pathname.startsWith("/tracking")) {
          router.replace("/login");
        }
      }
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setUser(session.user);
        await fetchProfile(session.user.id);
        if (pathname === "/login") router.replace("/");
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        if (pathname !== "/login" && !pathname.startsWith("/tracking")) {
          router.replace("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
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
