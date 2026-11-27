import Link from "next/link";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out";
import { requireStaff } from "@/lib/auth";

const nav = [
  { href: "/logos", label: "Fila do dia" },
  { href: "/logos/documentos", label: "Documentos" },
  { href: "/logos/clientes", label: "Clientes" },
  { href: "/logos/volume", label: "Volume x plano" },
];

export default async function StaffLayout({ children }: LayoutProps<"/logos">) {
  const profile = await requireStaff();
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-navy-950 p-5 text-gray-300">
        <Brand dark />
        <p className="mt-1 text-xs text-gray-400">Mesa do analista</p>
        <nav className="mt-8 flex flex-col gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm hover:bg-navy-800 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 text-sm">
          <p className="text-gray-400">{profile.full_name}</p>
          <SignOutButton dark />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
