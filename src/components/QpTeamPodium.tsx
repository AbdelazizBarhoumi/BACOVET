import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, XCircle, Trophy } from "lucide-react";

export interface QpTeam {
  rank: number;
  chain: string;
  score: number;
  rft_ok: boolean;
  br_ok: boolean;
  br_in_ok: boolean;
  br_gtd_ok: boolean;
}

export interface QpTeamPodiumProps {
  title: string;
  teams: QpTeam[];
  variant: "best" | "worst";
  isLoading?: boolean;
  error?: string | null;
}

const QpTeamPodium = ({ title, teams, variant, isLoading, error }: QpTeamPodiumProps) => {
  if (isLoading) {
    return (
      <Card className="p-4 h-[300px] flex flex-col">
        <Skeleton className="h-5 w-40 mb-8" />
        <div className="flex-1 flex items-end justify-around gap-2">
          <Skeleton className="h-[60%] w-full max-w-[80px]" />
          <Skeleton className="h-[90%] w-full max-w-[80px]" />
          <Skeleton className="h-[40%] w-full max-w-[80px]" />
        </div>
      </Card>
    );
  }

  if (error || !teams || teams.length === 0) {
    return (
      <Card className="p-4 h-[300px] flex flex-col items-center justify-center text-center bg-secondary/20 border-dashed">
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
        <h3 className="text-sm font-bold uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">Données DIVA + DRIVE requises</p>
        {error && <p className="text-[10px] text-destructive mt-2">{error}</p>}
      </Card>
    );
  }

  // Sort teams by rank to ensure correct placement: [2nd, 1st, 3rd]
  const second = teams.find((t) => t.rank === 2);
  const first = teams.find((t) => t.rank === 1);
  const third = teams.find((t) => t.rank === 3);

  const colors = {
    best: {
      1: "bg-yellow-500",
      2: "bg-slate-400",
      3: "bg-amber-700",
      text: "text-yellow-600",
    },
    worst: {
      1: "bg-status-red",
      2: "bg-status-orange",
      3: "bg-status-grey",
      text: "text-status-red",
    },
  }[variant];

  const Indicator = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-1 group relative">
      {ok ? (
        <CheckCircle2 className="h-3 w-3 text-success" />
      ) : (
        <XCircle className="h-3 w-3 text-status-red" />
      ) }
      <span className="text-[8px] font-bold opacity-70">{label}</span>
    </div>
  );

  const PodiumColumn = ({ team, height, rankColor }: { team?: QpTeam; height: string; rankColor: string }) => {
    if (!team) return <div className="flex-1" />;
    return (
      <div className="flex-1 flex flex-col items-center">
        <div className="text-center mb-2">
          <div className="text-xs font-black text-background">{team.chain}</div>
          <div className={`text-[10px] font-bold ${colors.text}`}>SCORE: {team.score}/12</div>
        </div>
        
        <div 
          className={`w-full max-w-[70px] ${rankColor} rounded-t-lg shadow-inner flex flex-col items-center pt-3 gap-2 relative transition-all duration-500 ease-out`}
          style={{ height }}
        >
          {team.rank === 1 && variant === "best" && (
            <Trophy className="h-6 w-6 text-white/90 absolute -top-8 animate-bounce" />
          )}
          
          <div className="flex flex-col gap-1.5 px-1">
            <Indicator ok={team.rft_ok} label="RFT" />
            <Indicator ok={team.br_in_ok} label="IN" />
            <Indicator ok={team.br_gtd_ok} label="GTD" />
            <Indicator ok={team.br_ok} label="CGL" />
          </div>
          
          <div className="mt-auto pb-2 text-white/40 text-2xl font-black">{team.rank}</div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 h-[320px] flex flex-col shadow-sm">
      <h3 className="text-sm font-black uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
        {variant === "best" ? "🏆" : "⚠️"} {title}
      </h3>
      
      <div className="flex-1 flex items-end justify-around gap-1 px-2">
        <PodiumColumn team={second} height="70%" rankColor={colors[2]} />
        <PodiumColumn team={first} height="100%" rankColor={colors[1]} />
        <PodiumColumn team={third} height="50%" rankColor={colors[3]} />
      </div>
    </Card>
  );
};

export default QpTeamPodium;
