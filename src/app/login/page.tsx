import { Brand } from "@/components/brand";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-4">
      <div className="mb-8 text-center">
        <Brand dark />
        <p className="mt-2 text-3xl font-bold text-white">
          Gestão <span className="text-logos-500">Inteligente</span>
          <br />
          para seu Negócio
        </p>
      </div>
      <div className="card w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
}
