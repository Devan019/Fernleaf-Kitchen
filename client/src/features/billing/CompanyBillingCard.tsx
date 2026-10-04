import { Button } from "@/components/ui/Button";
import type { CompanyBillingSummary } from "@/types";
import { ArrowRight, Building2, CheckCircle2, Clock, FileSpreadsheet, Receipt } from "lucide-react";
import Link from "next/link";

interface CompanyBillingCardProps {
  summary: CompanyBillingSummary;
}

export function CompanyBillingCard({ summary }: CompanyBillingCardProps) {
  const { company, uninvoicedOrderCount, uninvoicedAmount, openInvoiceCount, openInvoiceAmount, paidInvoiceCount, paidAmount } = summary;

  const totalOutstanding = (
    parseFloat(uninvoicedAmount || "0") + parseFloat(openInvoiceAmount || "0")
  ).toFixed(2);

  const hasOutstanding =
    uninvoicedOrderCount > 0 || openInvoiceCount > 0 || parseFloat(totalOutstanding) > 0;

  return (
    <div className="group rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs transition-all hover:border-[#294d33]/40 hover:shadow-md flex flex-col justify-between">
      <div className="space-y-4">
        {/* Card Header: Company Info */}
        <div className="flex items-start justify-between gap-3 border-b border-[#eee9dc] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#294d33]/10 text-[#294d33] font-serif font-black text-base shadow-2xs">
              {company.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-serif text-lg font-black text-[#26352a] tracking-tight">
                {company.name}
              </h3>
              <p className="text-[11px] font-mono text-[#78857a]">
                ID: {company.id}
              </p>
            </div>
          </div>

          {hasOutstanding ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#e27d34]/30 bg-[#fff5ec] px-2.5 py-1 text-[10px] font-black uppercase text-[#b85614]">
              <Clock size={11} />
              <span>Owes ${totalOutstanding}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#294d33]/20 bg-[#294d33]/5 px-2.5 py-1 text-[10px] font-black uppercase text-[#294d33]">
              <CheckCircle2 size={11} />
              <span>Up to date</span>
            </span>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Uninvoiced Orders Box */}
          <div className="rounded-2xl border border-[#eae5d8] bg-[#fbfaf6] p-3.5 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#5c685e]">
              <span>Uninvoiced Orders</span>
              <FileSpreadsheet size={13} className="text-[#e27d34]" />
            </div>
            <p className="font-serif text-xl font-black text-[#26352a]">
              {uninvoicedOrderCount}
            </p>
            <p className="text-xs font-bold text-[#e27d34]">
              ${parseFloat(uninvoicedAmount || "0").toFixed(2)}
            </p>
          </div>

          {/* Outstanding Invoices Box */}
          <div className="rounded-2xl border border-[#eae5d8] bg-[#fbfaf6] p-3.5 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#5c685e]">
              <span>Open Invoices</span>
              <Receipt size={13} className="text-[#b85614]" />
            </div>
            <p className="font-serif text-xl font-black text-[#26352a]">
              {openInvoiceCount}
            </p>
            <p className="text-xs font-bold text-[#b85614]">
              ${parseFloat(openInvoiceAmount || "0").toFixed(2)}
            </p>
          </div>
        </div>

        {/* Historical Settled Row */}
        <div className="flex items-center justify-between text-[11px] text-[#78857a] bg-[#f9f8f4] px-3.5 py-2 rounded-xl border border-[#eee9dc]">
          <span>Settled (Paid) Invoices:</span>
          <span className="font-bold text-[#294d33]">
            {paidInvoiceCount} (${parseFloat(paidAmount || "0").toFixed(2)})
          </span>
        </div>
      </div>

      {/* Card Action */}
      <div className="pt-5 mt-2 border-t border-[#eee9dc]">
        <Link href={`/dashboard/billing/${company.id}`} className="block">
          <Button
            variant="secondary"
            className="w-full justify-center group-hover:border-[#294d33] group-hover:bg-[#294d33] group-hover:text-white transition-all"
            icon={<ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />}
          >
            View Billing
          </Button>
        </Link>
      </div>
    </div>
  );
}
