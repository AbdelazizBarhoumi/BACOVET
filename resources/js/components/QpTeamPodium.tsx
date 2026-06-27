import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface QpTeam {
    rank: number;
    chain: string;
    score: number;
    rft_ok: boolean;
    br_ok: boolean;
    br_in_ok: boolean;
    br_gtd_ok: boolean;
    defect_pct?: number;
    max_score?: number;
    partial_score?: boolean;
}

export interface QpTeamPodiumProps {
    title: string;
    teams: QpTeam[];
    variant: 'best' | 'worst';
    isLoading?: boolean;
}

const TrophySvg = ({
    className,
    style,
}: {
    className?: string;
    style?: React.CSSProperties;
}) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
    >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

const AlertSvg = ({
    className,
    style,
}: {
    className?: string;
    style?: React.CSSProperties;
}) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
    >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
    </svg>
);

const Medaille1Svg = ({
    className,
    style,
}: {
    className?: string;
    style?: React.CSSProperties;
}) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
        <circle cx="12" cy="10" r="8" fill="currentColor" opacity="0.15" />
        <circle cx="12" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <text
            x="12"
            y="14"
            textAnchor="middle"
            fill="currentColor"
            fontSize="10"
            fontWeight="bold"
        >
            1
        </text>
        <path
            d="M9 18l3-4 3 4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
        />
    </svg>
);

const Medaille2Svg = ({
    className,
    style,
}: {
    className?: string;
    style?: React.CSSProperties;
}) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
        <circle cx="12" cy="10" r="8" fill="currentColor" opacity="0.1" />
        <circle cx="12" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <text
            x="12"
            y="14"
            textAnchor="middle"
            fill="currentColor"
            fontSize="10"
            fontWeight="bold"
        >
            2
        </text>
        <path
            d="M9 18l3-4 3 4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
        />
    </svg>
);

const Medaille3Svg = ({
    className,
    style,
}: {
    className?: string;
    style?: React.CSSProperties;
}) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
        <circle cx="12" cy="10" r="8" fill="currentColor" opacity="0.08" />
        <circle cx="12" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <text
            x="12"
            y="14"
            textAnchor="middle"
            fill="currentColor"
            fontSize="10"
            fontWeight="bold"
        >
            3
        </text>
        <path
            d="M9 18l3-4 3 4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
        />
    </svg>
);

const Indicator = ({ ok, label }: { ok: boolean | null; label: string }) => (
    <div
        className="flex items-center gap-1"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
    >
        {ok === null ? (
            <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
        ) : ok ? (
            <CheckCircle2 className="h-3 w-3 text-green-400" />
        ) : (
            <XCircle className="h-3 w-3 text-red-400" />
        )}
        <span className="text-[8px] font-bold text-white/90">{label}</span>
    </div>
);

const PodiumColumn = ({
    team,
    height,
    bgColor,
    textColor,
    variant,
    position,
}: {
    team?: QpTeam;
    height: string;
    bgColor: string;
    textColor: string;
    variant: 'best' | 'worst';
    position: 'first' | 'second' | 'third';
}) => {
    if (!team) return <div className="flex-1" />;

    const MedalSvg =
        position === 'first'
            ? Medaille1Svg
            : position === 'second'
              ? Medaille2Svg
              : Medaille3Svg;
    const maxScore = team.max_score || 4;

    return (
        <div className="flex flex-1 flex-col items-center">
            <div className="relative mb-2 text-center">
                {position === 'first' && variant === 'best' && (
                    <TrophySvg
                        className="mx-auto mb-1 h-8 w-8 text-amber-500"
                        style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                        }}
                    />
                )}
                {position === 'first' && variant === 'worst' && (
                    <AlertSvg
                        className="mx-auto mb-1 h-8 w-8 text-red-500"
                        style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                        }}
                    />
                )}
                <div
                    className="text-sm font-black tracking-wide text-foreground"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                >
                    {team.chain}
                </div>
                <div
                    className={`text-xs font-bold ${textColor}`}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                >
                    {team.score}/{maxScore}
                </div>
                {team.defect_pct !== undefined && (
                    <div
                        className="font-mono text-[9px] text-muted-foreground"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                    >
                        BR: {team.defect_pct}%
                    </div>
                )}
            </div>

            <div
                className={`w-full max-w-[80px] ${bgColor} relative flex flex-col items-center gap-1.5 rounded-t-lg pt-3 shadow-inner transition-all duration-500 ease-out`}
                style={{ height }}
            >
                <div className="flex flex-col gap-1 px-1.5">
                    <Indicator ok={team.rft_ok} label="RFT" />
                    <Indicator ok={team.br_gtd_ok} label="BR GTD" />
                    <Indicator ok={team.br_in_ok} label="BR IN" />
                    <Indicator ok={team.br_ok} label="BR" />
                </div>

                <div className="mt-auto pb-2">
                    <MedalSvg
                        className={`h-6 w-6 ${textColor}`}
                        style={{
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

const QpTeamPodium = ({
    title,
    teams,
    variant,
    isLoading,
}: QpTeamPodiumProps) => {
    if (isLoading) {
        return (
            <Card className="flex h-[340px] flex-col p-5">
                <Skeleton className="mb-8 h-5 w-48" />
                <div className="flex flex-1 items-end justify-around gap-3">
                    <Skeleton className="h-[60%] w-full max-w-[80px]" />
                    <Skeleton className="h-[90%] w-full max-w-[80px]" />
                    <Skeleton className="h-[40%] w-full max-w-[80px]" />
                </div>
            </Card>
        );
    }

    if (!teams || teams.length === 0) {
        return (
            <Card className="flex h-[340px] flex-col items-center justify-center border-dashed bg-secondary/20 p-5 text-center">
                <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
                <h3 className="mb-1 text-sm font-bold tracking-wider uppercase">
                    {title}
                </h3>
                <p className="text-xs text-muted-foreground">
                    Aucune donnée disponible
                </p>
            </Card>
        );
    }

    const second = teams.find((t) => t.rank === 2);
    const first = teams.find((t) => t.rank === 1);
    const third = teams.find((t) => t.rank === 3);

    const colors = {
        best: {
            1: 'bg-gradient-to-b from-amber-400 to-amber-500',
            2: 'bg-gradient-to-b from-gray-300 to-gray-400',
            3: 'bg-gradient-to-b from-orange-300 to-orange-400',
            text: 'text-amber-600',
        },
        worst: {
            1: 'bg-gradient-to-b from-red-400 to-red-500',
            2: 'bg-gradient-to-b from-orange-300 to-orange-400',
            3: 'bg-gradient-to-b from-gray-300 to-gray-400',
            text: 'text-red-600',
        },
    }[variant];

    const effectiveMax = first?.max_score || 4;

    return (
        <Card className="flex h-[360px] flex-col p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-black tracking-[0.15em] uppercase">
                    {variant === 'best' ? (
                        <TrophySvg className="h-5 w-5 text-amber-500" />
                    ) : (
                        <AlertSvg className="h-5 w-5 text-red-500" />
                    )}
                    {title}
                </h3>
                <span className="font-mono text-[10px] text-muted-foreground">
                    Score max: {effectiveMax}/{effectiveMax}
                </span>
            </div>

            <div className="flex flex-1 items-end justify-around gap-2 px-2">
                <PodiumColumn
                    team={second}
                    height="65%"
                    bgColor={colors[2]}
                    textColor={colors.text}
                    variant={variant}
                    position="second"
                />
                <PodiumColumn
                    team={first}
                    height="100%"
                    bgColor={colors[1]}
                    textColor={colors.text}
                    variant={variant}
                    position="first"
                />
                <PodiumColumn
                    team={third}
                    height="45%"
                    bgColor={colors[3]}
                    textColor={colors.text}
                    variant={variant}
                    position="third"
                />
            </div>
        </Card>
    );
};

export default QpTeamPodium;
