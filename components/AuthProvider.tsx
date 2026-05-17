"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        if (pathname === "/login") {
          router.replace("/");
        }
      } else {
        setIsAuthenticated(false);
        if (pathname !== "/login" && !pathname.startsWith("/tracking")) {
          router.replace("/login");
        }
      }
      setLoading(false);
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        if (pathname === "/login") {
          router.replace("/");
        }
      } else {
        setIsAuthenticated(false);
        if (pathname !== "/login" && !pathname.startsWith("/tracking")) {
          router.replace("/login");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // Optionally show a loading state while checking session initially
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
        <div style={{ width: 24, height: 24, border: "3px solid #bfdbfe", borderTop: "3px solid #1d4ed8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // If not authenticated and not on login page, don't render children to prevent flash
  if (!isAuthenticated && pathname !== "/login" && !pathname.startsWith("/tracking")) {
    return null; 
  }

  return <>{children}</>;
}
