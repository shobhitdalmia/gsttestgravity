import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { Sparkline } from "./Sparkline";

export type KpiTone =
  | "emerald"
  | "blue"
  | "purple"
  | "teal"
  | "orange"
  | "red"
  | "cyan"
  | "indigo"
  | "yellow"
  | "pink"
  | "sky"
  | "violet"
  | "slate";

export const toneVar = (tone: KpiTone) => `var(--kpi-${tone})`;
export const toneGradient = (tone: KpiTone) =>
  `linear-gradient(135deg, var(--kpi-${tone}) 0%, var(--kpi-${tone}-2) 100%)`;

export interface KpiRow {
  label: string;
  value: string;
  emphasis?: "normal" | "danger" | "success" | "muted";
}

export interface KpiCardProps {
  tone: KpiTone;
  icon: LucideIcon;
  label: string;
  /** Numeric value (animated). Use `valueText` for non-numeric output. */
  value?: number;
  format?: (n: number) => string;
  valueText?: string;
  subtitle?: string;
  rows?: KpiRow[];
  delta?: { pct: number | null; label?: string };
  badge?: { text: string; tone?: "success" | "danger" | "muted" };
  spark?: number[];
  progress?: { pct: number; label?: string };
  to?: string;
  children?: ReactNode;
}

const rowClass: Record<NonNullable<KpiRow["emphasis"]>, string> = {
  normal: "text-foreground",
  danger: "text-destructive",
  success: "text-success",
  muted: "text-muted-foreground",
};

export function KpiCard({
  tone,
  icon: Icon,
  label,
  value,
  format = (n) => String(Math.round(n)),
  valueText,
  subtitle,
  rows,
  delta,
  badge,
  spark,
  progress,
  to,
  children,
}: KpiCardProps) {
  const up = (delta?.pct ?? 0) >= 0;

  const body = (
    <div className="kpi-card kpi-card-hover group h-full p-4 sm:p-5">
      {/* tinted glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
        style={{ background: toneGradient(tone) }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: toneGradient(tone) }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm"
            style={{ background: toneGradient(tone) }}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            {subtitle ? <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div> : null}
          </div>
        </div>

        {delta?.pct != null ? (
          <span
            className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              up ? "bg-success/15 text-success" : "bg-destructive/12 text-destructive"
            }`}
            title={delta.label ?? "vs previous period"}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta.pct).toFixed(1)}%
          </span>
        ) : badge ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              badge.tone === "danger"
                ? "bg-destructive/12 text-destructive"
                : badge.tone === "success"
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {badge.text}
          </span>
        ) : null}
      </div>

      <div className="relative mt-3">
        {valueText != null ? (
          <div className="kpi-num font-display text-xl font-bold sm:text-[1.4rem]">{valueText}</div>
        ) : (
          <AnimatedNumber
            value={value ?? 0}
            format={format}
            className="kpi-num font-display text-xl font-bold sm:text-[1.4rem]"
          />
        )}
      </div>

      {rows?.length ? (
        <div className="relative mt-3 space-y-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-muted-foreground">{r.label}</span>
              <span className={`kpi-num shrink-0 font-semibold ${rowClass[r.emphasis ?? "normal"]}`}>{r.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {progress ? (
        <div className="relative mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${Math.max(0, Math.min(100, progress.pct))}%`,
                background: toneGradient(tone),
              }}
            />
          </div>
          {progress.label ? (
            <div className="mt-1 text-[11px] text-muted-foreground">{progress.label}</div>
          ) : null}
        </div>
      ) : null}

      {spark?.length ? (
        <div className="relative mt-3">
          <Sparkline data={spark} color={toneVar(tone)} />
        </div>
      ) : null}

      {children ? <div className="relative mt-3">{children}</div> : null}
    </div>
  );

  return body;
}

export function KpiCardLinked(props: KpiCardProps) {
  if (!props.to) return <KpiCard {...props} />;
  return (
    <Link to={props.to as never} className="block h-full focus-visible:outline-none">
      <KpiCard {...props} />
    </Link>
  );
}
