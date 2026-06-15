import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface BigNumberCardProps {
    label: string;
    value: number | string;
    unit?: string;
    target?: string;
    status?: 'green' | 'orange' | 'red' | 'grey';
    source?: string;
    isLoading?: boolean;
    error?: string | null;
}

const BigNumberCard = ({
    label,
    value,
    unit = '',
    target,
    status = 'grey',
    source,
    isLoading,
    error,
}: BigNumberCardProps) => {
    const statusColors = {
        green: 'text-success border-success',
        orange: 'text-status-orange border-status-orange',
        red: 'text-status-red border-status-red',
        grey: 'text-status-grey border-status-grey',
    };

    const bgStatusColors = {
        green: 'bg-success/10',
        orange: 'bg-status-orange/10',
        red: 'bg-status-red/10',
        grey: 'bg-status-grey/10',
    };

    if (isLoading) {
        return (
            <Card className="animate-pulse border-l-4 border-l-muted p-4">
                <Skeleton className="mb-3 h-3 w-24" />
                <Skeleton className="mb-3 h-10 w-32" />
                <Skeleton className="h-5 w-20" />
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="flex flex-col items-center justify-center border-l-4 border-status-red bg-status-red/5 p-4 text-center">
                <AlertCircle className="mb-2 h-5 w-5 text-status-red" />
                <p className="mb-1 text-[10px] font-bold tracking-wider text-status-red uppercase">
                    Erreur
                </p>
                <p className="line-clamp-2 text-[10px] text-status-red/80">
                    {error}
                </p>
            </Card>
        );
    }

    return (
        <Card
            className={`border-l-4 bg-white p-4 shadow-sm ${statusColors[status].split(' ')[1]}`}
        >
            <div className="flex h-full flex-col">
                <span className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    {label}
                </span>

                <div className="my-1 flex items-baseline gap-1">
                    <span
                        className={`text-4xl font-black tracking-tighter lg:text-5xl ${statusColors[status].split(' ')[0]}`}
                    >
                        {typeof value === 'number'
                            ? value.toLocaleString('fr-FR')
                            : value}
                    </span>
                    {unit && (
                        <span
                            className={`text-xl font-bold ${statusColors[status].split(' ')[0]}`}
                        >
                            {unit}
                        </span>
                    )}
                </div>

                {target && (
                    <div className="mt-auto pt-2">
                        <Badge
                            variant="outline"
                            className={`border-none text-[10px] font-bold ${bgStatusColors[status]} ${statusColors[status].split(' ')[0]}`}
                        >
                            CIBLE: {target}
                        </Badge>
                    </div>
                )}

                {source && (
                    <span className="mt-2 font-mono text-[9px] text-muted-foreground/60 uppercase">
                        SOURCE: {source}
                    </span>
                )}
            </div>
        </Card>
    );
};

export default BigNumberCard;
