import { signOut } from "@/app/login/actions";

export function SignOutButton({ dark = false }: { dark?: boolean }) {
  return (
    <form action={signOut}>
      <button className={`text-sm ${dark ? "text-gray-300 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>
        Sair
      </button>
    </form>
  );
}
