import type { InvoiceFull } from "./types";
import { formatNumber } from "@/lib/gst";

/** Thermal receipt for 58mm (2 inch) and 80mm (3 inch) printers. */
export function InvoiceThermal({ inv, width }: { inv: InvoiceFull; width: "58mm" | "80mm" }) {
  const c = inv.company;
  const p = inv.party;
  const balance = Math.max(0, Number(inv.total) - Number(inv.amount_paid));
  const compact = width === "58mm";
  const tax = Number(inv.cgst) + Number(inv.sgst) + Number(inv.igst);

  return (
    <div
      className={`invoice-thermal mx-auto bg-white text-black ${compact ? "text-[10px]" : "text-[11px]"}`}
      style={{ width, padding: compact ? "4mm 2mm" : "5mm 3mm", fontFamily: "ui-monospace, monospace" }}
    >
      <div className="text-center">
        <div className={`font-bold uppercase ${compact ? "text-[12px]" : "text-[14px]"}`}>{c?.name}</div>
        {c?.address && <div>{c.address}</div>}
        {c?.phone && <div>Ph: {c.phone}</div>}
        {c?.gstin && <div>GSTIN: {c.gstin}</div>}
        <div className="mt-1 font-semibold">TAX INVOICE</div>
      </div>

      <Dashes />
      <Row left={`No: ${inv.invoice_number}`} right="" />
      <Row left={`Date: ${inv.invoice_date}`} right="" />
      <Row left={`Party: ${p?.name ?? "Walk-in"}`} right="" />
      {p?.gstin && <Row left={`GSTIN: ${p.gstin}`} right="" />}
      <Dashes />

      {inv.items.map((it) => (
        <div key={it.id} className="mb-1">
          <div className="font-semibold">{it.name}</div>
          <Row
            left={`${formatNumber(it.quantity)}${it.unit ? ` ${it.unit}` : ""} x ${formatNumber(it.rate)}`}
            right={formatNumber(it.total)}
          />
          {!compact && <Row left={`HSN ${it.hsn_code ?? "-"} | GST ${formatNumber(it.gst_rate)}%`} right="" />}
        </div>
      ))}

      <Dashes />
      <Row left="Taxable" right={formatNumber(inv.subtotal)} />
      {inv.is_interstate ? (
        <Row left="IGST" right={formatNumber(inv.igst)} />
      ) : (
        <>
          <Row left="CGST" right={formatNumber(inv.cgst)} />
          <Row left="SGST" right={formatNumber(inv.sgst)} />
        </>
      )}
      {compact && <Row left="Total Tax" right={formatNumber(tax)} />}
      <Dashes />
      <Row left="TOTAL" right={`Rs ${formatNumber(inv.total)}`} bold />
      <Row left="Paid" right={formatNumber(inv.amount_paid)} />
      <Row left="Balance" right={`Rs ${formatNumber(balance)}`} bold />
      <Dashes />
      <div className="text-center">Thank you! Visit again.</div>
    </div>
  );
}

function Row({ left, right, bold }: { left: string; right: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span className="min-w-0 break-words">{left}</span>
      <span className="shrink-0">{right}</span>
    </div>
  );
}

function Dashes() {
  return <div className="my-1 border-t border-dashed border-black" />;
}
