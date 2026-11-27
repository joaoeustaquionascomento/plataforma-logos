const tones: Record<string, string> = {
  green: "bg-logos-50 text-logos-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-50 text-blue-700",
};

export function StatusBadge({ label, tone = "gray" }: { label: string; tone?: keyof typeof tones }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{label}</span>;
}

export function payableTone(status: string): keyof typeof tones {
  if (status === "confirmed" || status === "paid") return "green";
  if (status === "awaiting_bank_approval") return "amber";
  if (status === "canceled") return "gray";
  return "blue";
}

export function documentTone(status: string): keyof typeof tones {
  if (status === "needs_review" || status === "error") return "red";
  if (status === "extracted") return "amber";
  if (status === "processed") return "green";
  return "gray";
}
