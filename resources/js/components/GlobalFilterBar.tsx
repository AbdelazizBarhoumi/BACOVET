import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GlobalFilterBar = () => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        { name: "Marque", opts: ["Toutes", "DOMYOS", "NABAIJI", "KALENJI", "QUECHUA"] },
        { name: "Atelier", opts: ["Tous", "Atelier 1", "Atelier 2", "Coupe", "Sérigraphie"] },
        { name: "Ligne", opts: ["Toutes", "CH1", "CH2", "CH3"] },
        { name: "OF", opts: ["Tous", "OF-4402", "OF-4391", "OF-4388"] },
      ].map((f) => (
        <Select key={f.name} defaultValue={f.opts[0]}>
          <SelectTrigger className="w-[140px] h-8 text-xs font-mono uppercase bg-secondary border-border">
            <span className="text-muted-foreground mr-1">{f.name}:</span>
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
