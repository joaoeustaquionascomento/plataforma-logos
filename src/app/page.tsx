import { redirect } from "next/navigation";
import { isStaff, requireProfile } from "@/lib/auth";

export default async function Home() {
  const profile = await requireProfile();
  redirect(isStaff(profile) ? "/logos" : "/portal");
}
