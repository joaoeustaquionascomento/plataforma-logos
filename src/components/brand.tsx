export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`text-lg font-bold ${dark ? "text-white" : "text-navy-950"}`}>
      Lógos<span className="text-logos-500">BPO</span>
    </span>
  );
}
