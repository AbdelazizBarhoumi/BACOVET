import { BigNumberCard } from '@/components/widgets';
import type { Status } from '@/lib/mock';

interface ProductionKpiCardProps {
    label: string;
    value: number | string;
    unit?: string;
    target?: string;
    status?: Status;
    source?: string;
    isLoading?: boolean;
    onClick?: () => void;
}

export function ProductionKpiCard({
    onClick,
    ...props
}: ProductionKpiCardProps) {
    return (
        <div
            onClick={onClick}
            className={
                onClick
                    ? 'group h-full cursor-pointer transition-all'
                    : 'h-full'
            }
        >
            <BigNumberCard {...props} />
        </div>
    );
}
