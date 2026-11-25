import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { LocalStore } from "@/lib/store/local";
import { SupabaseStore } from "@/lib/store/supabase";
import type { Store } from "@/lib/store/types";

let local: LocalStore | null = null;

export function getStore(): Store {
  if (isSupabaseConfigured()) return new SupabaseStore();
  local ??= new LocalStore();
  return local;
}

export function getLocalStore(): LocalStore | null {
  if (isSupabaseConfigured()) return null;
  local ??= new LocalStore();
  return local;
}
