import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { sessionContractorId } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { getStore } from "@/lib/store";
import type { ContractorRecord } from "@/lib/store/types";
import { supabaseServer } from "@/lib/supabase/server";

export const getCurrentContractor = cache(async (): Promise<ContractorRecord | null> => {
  const store = getStore();
  if (isSupabaseConfigured()) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return store.findContractorByAuthUserId(data.user.id);
  }
  const contractorId = await sessionContractorId();
  if (!contractorId) return null;
  return store.findContractorById(contractorId);
});

export async function requireContractor(): Promise<ContractorRecord> {
  const contractor = await getCurrentContractor();
  if (!contractor) redirect("/login");
  return contractor;
}
