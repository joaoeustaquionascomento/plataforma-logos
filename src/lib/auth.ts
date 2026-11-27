import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "logos_admin" | "logos_analyst" | "client";

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  client_id: string | null;
};

export function isStaff(profile: Profile) {
  return profile.role === "logos_admin" || profile.role === "logos_analyst";
}

/** Usuário logado e seu perfil. Manda para o login se não houver sessão. */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, client_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login?erro=perfil");
  return profile as Profile;
}

export async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/portal");
  return profile;
}

export async function requireClientUser(): Promise<Profile & { client_id: string }> {
  const profile = await requireProfile();
  if (isStaff(profile)) redirect("/logos");
  if (!profile.client_id) redirect("/login?erro=sem-empresa");
  return profile as Profile & { client_id: string };
}
