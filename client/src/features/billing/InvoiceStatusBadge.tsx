import { Badge } from "@/components/ui/Badge";
import type { InvoiceStatus } from "@/types";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  switch (status) {
    case "OPEN":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border border-[#e27d34]/30 bg-[#fff5ec] text-[#b85614] ${className || ""}`}
        >
          <Clock size={12} className="shrink-0" />
          <span>UNPAID</span>
        </span>
      );
    case "PAID":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border border-[#294d33]/30 bg-[#294d33]/10 text-[#294d33] ${className || ""}`}
        >
          <CheckCircle2 size={12} className="shrink-0" />
          <span>PAID</span>
        </span>
      );
    case "VOID":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border border-[#d9d2c2] bg-[#f3efe6] text-[#78857a] ${className || ""}`}
        >
          <XCircle size={12} className="shrink-0" />
          <span>VOID</span>
        </span>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}
