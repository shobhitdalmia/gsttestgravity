import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { Sparkline } from "./Sparkline";
import type { KpiTone } from "./KpiCard";
import { toneGradient, toneVar } from "./KpiCard";

export interface StatCardProps {
  tone: KpiTone;
  icon: LucideIcon;
  label: string;
  value?: number;
  format?: (n: number) => string;
  valueText?: string;
  deltaPct?: number | null;
  deltaLabel?: string;
  spark?: number[];
  to?: string;
}

/** Compact, tinted KPI tile — icon chip + big number + delta + inline sparkline. */
export function StatCard({
  tone,
  icon: Icon,
  label,
  value,
  format = (n) => String(Math.round(n)),
  valueText,
  deltaPct,
  deltaLabel = "vs last period",
  spark,
  to,
}: StatCardProps) {
  const up = (deltaPct ?? 0) >= 0;

  const body = (
    <div
      className="stat-card stat-card-hover group h-full p-4"
      style={{ ["--tint" as string]: toneVar(tone) }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm"
          style={{ background: toneGradient(tone) }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold" style={{ color: toneVar(tone) }}>
            {label}
          </div>
          {valueText != null ? (
            <div className="kpi-num truncate font-display text-[1.35rem] font-bold leading-tight">{valueText}</div>
          ) : (
            <AnimatedNumber
              value={value ?? 0}
              format={format}
              className="kpi-num block font-display text-[1.35rem] font-bold leading-tight"
            />
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
          {deltaPct != null ? (
            <>
              <span className={`flex shrink-0 items-center gap-0.5 font-bold ${up ? "text-success" : "text-destructive"}`}>
                {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(deltaPct).toFixed(1)}%
              </span>
              <span className="truncate text-muted-foreground">{deltaLabel}</span>
            </>
          ) : (
            <span className="truncate text-muted-foreground">{deltaLabel}</span>
          )}
        </div>
        {spark?.length ? (
          <div className="w-[92px] shrink-0">
            <Sparkline data={spark} color={toneVar(tone)} height={30} />
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!to) return body;
  return (
    <Link to={to as never} className="block h-full focus-visible:outline-none">
      {body}
    </Link>
  );
}
