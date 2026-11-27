import Link from "next/link";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out";
import { requireClientUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const nav = [
  { href: "/portal", label: "Início" },
  { href: "/portal/enviar", label: "Enviar documento" },
  { href: "/portal/pagamentos", label: "Pagamentos" },
  { href: "/portal/pendencias", label: "Pendências" },
];

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const profile = await requireClientUser();
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("name").eq("id", profile.client_id).single();

  return (
    <div className="min-h-screen">
      <header className="bg-navy-950 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <Brand dark />
            <p className="text-xs text-gray-400">{client?.name}</p>
          </div>
          <SignOutButton dark />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-gray-300 hover:bg-navy-800 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
