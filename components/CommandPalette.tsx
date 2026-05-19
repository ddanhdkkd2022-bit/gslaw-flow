"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Project {
  id: string;
  customer_name: string;
  customer_phone?: string;
  status: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Project[]>([]);
  const router = useRouter();

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch results based on query
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const fetchSearch = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, customer_name, customer_phone, status")
        .or(`customer_name.ilike.%${query}%,customer_phone.ilike.%${query}%`)
        .limit(10);
      
      if (data) setResults(data);
    };

    const timeoutId = setTimeout(() => fetchSearch(), 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!open) return null;

  return (
    <div cmdk-overlay="" onClick={() => setOpen(false)}>
      <Command 
        cmdk-dialog=""
        shouldFilter={false} // We do custom server-side filtering
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900"
      >
        <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <Command.Input 
            value={query} 
            onValueChange={setQuery} 
            placeholder="Tìm tên khách hàng hoặc SĐT..." 
            cmdk-input="" 
            autoFocus
            aria-label="Tìm kiếm nhanh hồ sơ"
          />
        </div>
        
        <Command.List cmdk-list="">
          {query.length > 0 && results.length === 0 && (
            <Command.Empty cmdk-empty="">Không tìm thấy kết quả phù hợp.</Command.Empty>
          )}

          {results.map((item) => (
            <Command.Item
              key={item.id}
              value={item.id}
              onSelect={() => {
                router.push(`/project/${item.id}`);
                setOpen(false);
              }}
              cmdk-item=""
            >
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 dark:text-slate-100">{item.customer_name}</span>
                {item.customer_phone && <span className="text-xs text-slate-500 dark:text-slate-400">{item.customer_phone}</span>}
              </div>
              <span className="ml-auto text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
                {item.status || "Chưa rõ"}
              </span>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
