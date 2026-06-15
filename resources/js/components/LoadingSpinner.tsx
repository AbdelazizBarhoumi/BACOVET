import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const LoadingSpinner = ({
    size = 'md',
    className = '',
}: LoadingSpinnerProps) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    return (
        <div className={`flex items-center justify-center p-4 ${className}`}>
            <Loader2
                className={`${sizeClasses[size]} animate-spin text-primary`}
            />
        </div>
    );
};

export default LoadingSpinner;
