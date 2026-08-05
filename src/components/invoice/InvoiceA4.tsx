import type { InvoiceFull } from "./types";
import { formatNumber, amountInWords, hsnSummary, stateLabel } from "@/lib/gst";

/**
 * A4 GST Tax Invoice / Bill of Supply — print-ready, plain black on white.
 * Layout mirrors the classic Indian tax-invoice format (meta box, billed/shipped
 * to, items table, tax lines, HSN summary, bank details, terms + signatory).
 */
export function InvoiceA4({ inv }: { inv: InvoiceFull }) {
  const c = inv.company;
  const p = inv.party;
  const isBOS = inv.invoice_type === "bill_of_supply";
  const balance = Math.max(0, Number(inv.total) - Number(inv.amount_paid));
  const summary = hsnSummary(inv.items);
  const totalQty = inv.items.reduce((s, i) => s + Number(i.quantity ?? 0), 0);
  const unitLabel = inv.items[0]?.unit ?? "Pcs.";
  const gstRates = [...new Set(inv.items.map((i) => Number(i.gst_rate)))].filter((r) => r > 0);
  const rateLabel = gstRates.length === 1 ? formatNumber(gstRates[0]! / 2) : "";
  const igstRateLabel = gstRates.length === 1 ? formatNumber(gstRates[0]!) : "";
  const shipTo = inv.shipping_address ?? p?.billing_address ?? null;
  const companyLine = [c?.address, c?.city, c?.state, c?.pincode].filter(Boolean).join(", ");
  const terms = (inv.terms ?? c?.default_terms ?? "").trim();
  const bank = [
    c?.bank_name,
    c?.bank_account_no ? `A/C No: ${c.bank_account_no}` : null,
    c?.bank_ifsc ? `IFSC :- ${c.bank_ifsc}` : null,
    c?.bank_branch ? `Branch : ${c.bank_branch}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <div className="invoice-a4 mx-auto w-[820px] max-w-full bg-white p-6 text-[12px] leading-tight text-black">
      <div className="border border-black">
        {/* ── Header ─────────────────────────────── */}
        <div className="relative border-b border-black px-3 py-2">
          <div className="absolute right-3 top-2 text-[11px] italic">Buyer Copy</div>
          <div className="flex items-start gap-3">
            {c?.logo_url ? (
              <img
                src={c.logo_url}
                alt={`${c?.name ?? "Company"} logo`}
                className="h-[70px] w-[110px] shrink-0 border border-black object-contain"
              />
            ) : (
              <div className="h-[70px] w-[110px] shrink-0" />
            )}
            <div className="min-w-0 flex-1 text-center">
              <div className="text-[10px] font-semibold">
                {isBOS
                  ? "( Composition / exempt supply — Input Tax Credit is NOT available against this copy )"
                  : "( Input Tax Credit is available to a taxable person against this copy )"}
              </div>
              <div className="mt-0.5 inline-block border-b border-black text-[13px] font-bold tracking-wide">
                {isBOS ? "BILL OF SUPPLY" : "TAX INVOICE"}
              </div>
              <div className="text-[22px] font-bold uppercase leading-tight">{c?.name ?? "—"}</div>
              {companyLine && <div className="text-[12px]">{companyLine}</div>}
              {c?.gstin && <div className="text-[12px] font-bold">GSTIN : {c.gstin}</div>}
              <div className="text-[11px] font-semibold italic">
                {c?.phone ? `Tel. : ${c.phone}` : ""}
                {c?.phone && c?.email ? "   " : ""}
                {c?.email ? `email : ${c.email}` : ""}
              </div>
            </div>
            <div className="h-[70px] w-[70px] shrink-0" />
          </div>
        </div>

        {/* ── Invoice / transport meta ───────────── */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-2">
            <Meta label="Invoice No." value={inv.invoice_number} />
            <Meta
              label="Dated"
              value={`${fmtDate(inv.invoice_date)}${inv.invoice_time ? `   (${inv.invoice_time})` : ""}`}
            />
            <Meta label="Place of Supply" value={stateLabel(inv.place_of_supply, p?.state)} />
            <Meta label="Reverse Charge" value={inv.reverse_charge ? "Y" : "N"} />
          </div>
          <div className="p-2">
            <Meta label="GR/RR No." value={inv.gr_rr_no ?? ""} />
            <Meta label="Transport" value={inv.transport_name ?? ""} />
            <Meta label="Vehicle No." value={inv.vehicle_no ?? ""} />
            <Meta label="Station" value={inv.station ?? ""} />
          </div>
        </div>

        {/* ── Billed to / Shipped to ─────────────── */}
        <div className="grid grid-cols-2 border-b border-black">
          <PartyBlock
            title="Billed to"
            name={p?.name ?? "Walk-in Customer"}
            address={p?.billing_address}
            phone={p?.phone}
            state={stateLabel(p?.state_code, p?.state)}
            gstin={p?.gstin}
            className="border-r border-black"
          />
          <PartyBlock
            title="Shipped to"
            name={p?.name ?? "Walk-in Customer"}
            address={shipTo}
            phone={p?.phone}
            state={stateLabel(p?.state_code, p?.state)}
            gstin={p?.gstin}
          />
        </div>

        {/* ── Items ─────────────────────────────── */}
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-black">
              <Th className="w-[6%]">S.N.</Th>
              <Th className="text-left">Description of Goods</Th>
              <Th className="w-[13%] text-left">HSN/SAC Code</Th>
              <Th className="w-[9%] text-right">Qty.</Th>
              <Th className="w-[9%] text-left">Unit</Th>
              <Th className="w-[12%] text-right">Price</Th>
              <Th className="w-[14%] text-right" last>
                Amount(₹)
              </Th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, idx) => (
              <tr key={it.id} className="align-top">
                <Td className="text-right">{idx + 1}.</Td>
                <Td>{it.name}</Td>
                <Td>{it.hsn_code ?? ""}</Td>
                <Td className="text-right">{Number(it.quantity).toFixed(2)}</Td>
                <Td>{it.unit ?? ""}</Td>
                <Td className="text-right">{Number(it.rate).toFixed(2)}</Td>
                <Td className="text-right" last>
                  {formatNumber(it.taxable_amount)}
                </Td>
              </tr>
            ))}
            {/* keeps the tall body area of a printed bill */}
            <tr className="h-[150px] align-top">
              <Td>&nbsp;</Td>
              <Td>&nbsp;</Td>
              <Td>&nbsp;</Td>
              <Td>&nbsp;</Td>
              <Td>&nbsp;</Td>
              <Td>&nbsp;</Td>
              <Td last>&nbsp;</Td>
            </tr>
          </tbody>
        </table>

        {/* ── Tax lines ─────────────────────────── */}
        <div className="border-t border-black">
          <TaxLine label="" at="" value={formatNumber(inv.subtotal)} bold />
          {!isBOS &&
            (inv.is_interstate ? (
              <TaxLine label="Add   : IGST" at={igstRateLabel ? `@   ${igstRateLabel} %` : ""} value={formatNumber(inv.igst)} />
            ) : (
              <>
                <TaxLine label="Add   : CGST" at={rateLabel ? `@   ${rateLabel} %` : ""} value={formatNumber(inv.cgst)} />
                <TaxLine label="Add   : SGST" at={rateLabel ? `@   ${rateLabel} %` : ""} value={formatNumber(inv.sgst)} />
              </>
            ))}
        </div>

        {/* ── Grand total ───────────────────────── */}
        <div className="flex items-stretch border-t border-black">
          <div className="flex flex-1 items-center justify-end gap-6 p-2 text-[14px] font-bold">
            <span>Grand Total</span>
            <span>
              {totalQty.toFixed(2)} {unitLabel}
            </span>
            <span>₹</span>
          </div>
          <div className="w-[14%] border-l border-black p-2 text-right text-[14px] font-bold">
            {formatNumber(inv.total)}
          </div>
        </div>

        {/* ── HSN summary ───────────────────────── */}
        {!isBOS && summary.length > 0 && (
          <div className="border-t border-black p-2">
            <table className="text-[11px]">
              <thead>
                <tr className="font-bold">
                  <td className="pr-3">HSN/SAC</td>
                  <td className="pr-4">Tax Rate</td>
                  <td className="pr-3 text-right">Main Qty.</td>
                  <td className="pr-4">UQC</td>
                  <td className="pr-4 text-right">Taxable Amt.</td>
                  {inv.is_interstate ? (
                    <td className="pr-4 text-right">IGST Amt.</td>
                  ) : (
                    <>
                      <td className="pr-4 text-right">CGST Amt.</td>
                      <td className="pr-4 text-right">SGST Amt.</td>
                    </>
                  )}
                  <td className="text-right">Total Tax</td>
                </tr>
              </thead>
              <tbody>
                {summary.map((r) => (
                  <tr key={`${r.hsn}-${r.rate}`}>
                    <td className="pr-3">{r.hsn}</td>
                    <td className="pr-4">{formatNumber(r.rate)}%</td>
                    <td className="pr-3 text-right">{r.qty.toFixed(2)}</td>
                    <td className="pr-4">{r.uqc}</td>
                    <td className="pr-4 text-right">{formatNumber(r.taxable)}</td>
                    {inv.is_interstate ? (
                      <td className="pr-4 text-right">{formatNumber(r.igst)}</td>
                    ) : (
                      <>
                        <td className="pr-4 text-right">{formatNumber(r.cgst)}</td>
                        <td className="pr-4 text-right">{formatNumber(r.sgst)}</td>
                      </>
                    )}
                    <td className="text-right">{formatNumber(r.totalTax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Amount in words ───────────────────── */}
        <div className="border-t border-black p-2 text-[13px] font-bold">{amountInWords(Number(inv.total))}</div>

        {Number(inv.amount_paid) > 0 && (
          <div className="border-t border-black p-2 text-[11px]">
            <span className="font-bold">Received : </span>
            {formatNumber(inv.amount_paid)}
            <span className="ml-4 font-bold">Balance Due : </span>₹ {formatNumber(balance)}
          </div>
        )}

        {bank && (
          <div className="border-t border-black p-2 text-[12px]">
            <span className="font-bold">Bank Details: </span>
            {bank}
          </div>
        )}

        {inv.notes && (
          <div className="border-t border-black p-2 text-[11px]">
            <span className="font-bold">Note: </span>
            <span className="whitespace-pre-wrap">{inv.notes}</span>
          </div>
        )}

        {/* ── Terms + signatory ─────────────────── */}
        <div className="grid grid-cols-2 border-t border-black text-[11px]">
          <div className="border-r border-black p-2">
            <div className="inline-block border-b border-black font-bold">Terms &amp; Conditions</div>
            <div className="mt-1 whitespace-pre-wrap">
              {terms ||
                `E.& O.E.
1. Goods once sold will not be taken back.
2. Interest @ 24% p.a. will be charged if the payment is not made with in the stipulated time.
3. Subject to '${c?.jurisdiction ?? c?.city ?? c?.state ?? "local"}' Jurisdiction only.`}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="border-b border-black p-2 font-bold">Receiver's Signature :</div>
            <div className="flex flex-1 flex-col justify-between p-2 text-center">
              <div className="font-bold">For {c?.name ?? ""}</div>
              <div className="mt-8 font-bold">Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtDate(iso: string) {
  const [y, m, d] = (iso ?? "").split("-");
  return y ? `${d}-${m}-${y}` : iso;
}

function Th({ children, className = "", last }: { children: React.ReactNode; className?: string; last?: boolean }) {
  return <th className={`p-1.5 font-bold ${last ? "" : "border-r border-black"} ${className}`}>{children}</th>;
}

function Td({ children, className = "", last }: { children: React.ReactNode; className?: string; last?: boolean }) {
  return <td className={`p-1.5 ${last ? "" : "border-r border-black"} ${className}`}>{children}</td>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="w-[110px] shrink-0">{label}</span>
      <span className="shrink-0">:</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}

function PartyBlock({
  title,
  name,
  address,
  phone,
  state,
  gstin,
  className = "",
}: {
  title: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  state?: string | null;
  gstin?: string | null;
  className?: string;
}) {
  return (
    <div className={`p-2 ${className}`}>
      <div className="font-bold italic">{title}   :</div>
      <div className="font-semibold uppercase">{name}</div>
      {address && <div className="whitespace-pre-wrap">{address}</div>}
      <div className="mt-4">
        <Meta label="Party Mobile No" value={phone ?? ""} />
        <Meta label="State" value={state ?? ""} />
        <Meta label="GSTIN / UIN" value={gstin ?? ""} />
      </div>
    </div>
  );
}

function TaxLine({ label, at, value, bold }: { label: string; at: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-stretch ${bold ? "font-bold" : "italic"}`}>
      <div className="flex flex-1 items-center justify-end gap-10 px-2 py-0.5">
        <span>{label}</span>
        <span className="w-[80px] text-left">{at}</span>
      </div>
      <div className="w-[14%] border-l border-black px-2 py-0.5 text-right">{value}</div>
    </div>
  );
}
