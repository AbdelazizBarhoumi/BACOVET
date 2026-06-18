import { BigNumberCard } from '@/components/widgets';
import type { Status } from '@/lib/mock';

interface ProductionKpiCardProps {
    label: string;
    value: number | string;
    unit?: string;
    target?: string;
    status?: Status;
    source?: string;
    badge?: string;
    isLoading?: boolean;
    onClick?: () => void;
}

export function ProductionKpiCard({
    onClick,
    ...props
}: ProductionKpiCardProps) {
    const flash = props.status === 'red' || props.status === 'orange';
    return (
        <div
            onClick={onClick}
            className={`h-full ${onClick ? 'group cursor-pointer transition-all' : ''} ${flash ? 'animate-flash-alert' : ''}`}
        >
            <BigNumberCard {...props} />
        </div>
    );
}
