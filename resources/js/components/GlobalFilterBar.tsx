import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilters, type FilterState } from "@/context/FilterContext";

const FILTERS: { key: keyof FilterState; label: string; opts: string[] }[] = [
  { key: "marque", label: "Marque", opts: ["Toutes", "DOMYOS", "NABAIJI", "KALENJI", "QUECHUA"] },
  { key: "ligne", label: "Ligne", opts: ["Toutes", "CH1", "CH2", "CH3", "CH4"] },
  { key: "of", label: "OF", opts: ["Tous"] },
];

const GlobalFilterBar = () => {
  const { filters, setFilter } = useFilters();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((f) => (
        <Select
          key={f.key}
          value={filters[f.key] || f.opts[0]}
          onValueChange={(v) => setFilter(f.key, v)}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs font-mono uppercase bg-secondary border-border">
            <span className="text-muted-foreground mr-1">{f.label}:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {f.opts.map((o) => (
              <SelectItem key={o} value={o} className="text-xs font-mono">
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
};

export default GlobalFilterBar;
