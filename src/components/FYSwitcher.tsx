import { CalendarRange, Check, ChevronsUpDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALL_YEARS, fyLabel, useFYOptions, useFinancialYear, type FYValue } from "@/lib/fy";

export function FYSwitcher({
  companyId,
  variant = "sidebar",
  onSelected,
}: {
  companyId: string | undefined;
  variant?: "sidebar" | "compact";
  onSelected?: () => void;
}) {
  const { fy, setFY, label } = useFinancialYear(companyId);
  const years = useFYOptions(companyId);
  const qc = useQueryClient();

  async function choose(v: FYValue) {
    setFY(v);
    onSelected?.();
    await qc.invalidateQueries();
  }

  const options: FYValue[] = [...years, ALL_YEARS];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "sidebar" ? (
          <button className="w-full rounded-lg border border-sidebar-border/60 px-3 py-2 text-left text-xs transition hover:bg-sidebar-accent">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sidebar-foreground/60">Financial Year</div>
                <div className="truncate font-semibold text-sidebar-foreground">{label}</div>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
            </div>
          </button>
        ) : (
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Select financial year</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((v) => (
          <DropdownMenuItem key={String(v)} onClick={() => choose(v)}>
            <Check className={`mr-2 h-4 w-4 shrink-0 ${v === fy ? "opacity-100" : "opacity-0"}`} />
            <span className="text-sm">{fyLabel(v)}</span>
            {v !== ALL_YEARS && (
              <span className="ml-auto text-[10px] text-muted-foreground">1 Apr – 31 Mar</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
