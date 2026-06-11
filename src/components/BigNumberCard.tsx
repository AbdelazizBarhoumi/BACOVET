import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export interface BigNumberCardProps {
  label: string;
  value: number | string;
  unit?: string;
  target?: string;
  status?: "green" | "orange" | "red" | "grey";
  source?: string;
  isLoading?: boolean;
  error?: string | null;
}

const BigNumberCard = ({
  label,
  value,
  unit = "",
  target,
  status = "grey",
  source,
  isLoading,
  error,
}: BigNumberCardProps) => {
  const statusColors = {
    green: "text-success border-success",
    orange: "text-status-orange border-status-orange",
    red: "text-status-red border-status-red",
    grey: "text-status-grey border-status-grey",
  };

  const bgStatusColors = {
    green: "bg-success/10",
    orange: "bg-status-orange/10",
    red: "bg-status-red/10",
    grey: "bg-status-grey/10",
  };

  if (isLoading) {
    return (
      <Card className="p-4 border-l-4 border-l-muted animate-pulse">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-10 w-32 mb-3" />
        <Skeleton className="h-5 w-20" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-l-4 border-status-red bg-status-red/5 flex flex-col items-center justify-center text-center">
        <AlertCircle className="h-5 w-5 text-status-red mb-2" />
        <p className="text-[10px] font-bold text-status-red uppercase tracking-wider mb-1">Erreur</p>
        <p className="text-[10px] text-status-red/80 line-clamp-2">{error}</p>
      </Card>
    );
  }

  return (
    <Card className={`p-4 border-l-4 shadow-sm bg-white ${statusColors[status].split(" ")[1]}`}>
      <div className="flex flex-col h-full">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </span>
        
        <div className="flex items-baseline gap-1 my-1">
          <span className={`text-4xl lg:text-5xl font-black tracking-tighter ${statusColors[status].split(" ")[0]}`}>
            {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
          </span>
          {unit && (
            <span className={`text-xl font-bold ${statusColors[status].split(" ")[0]}`}>
              {unit}
            </span>
          )}
        </div>

        {target && (
          <div className="mt-auto pt-2">
            <Badge 
              variant="outline" 
              className={`text-[10px] font-bold border-none ${bgStatusColors[status]} ${statusColors[status].split(" ")[0]}`}
            >
              CIBLE: {target}
            </Badge>
          </div>
        )}

        {source && (
          <span className="text-[9px] text-muted-foreground/60 uppercase font-mono mt-2">
            SOURCE: {source}
          </span>
        )}
      </div>
    </Card>
  );
};

export default BigNumberCard;
