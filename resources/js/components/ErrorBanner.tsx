import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';

export interface ErrorBannerProps {
    message: string;
    onDismiss?: () => void;
}

const ErrorBanner = ({ message, onDismiss }: ErrorBannerProps) => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    const handleDismiss = () => {
        setIsVisible(false);
        if (onDismiss) onDismiss();
    };

    return (
        <div className="flex animate-in items-center justify-between gap-3 rounded-md bg-status-red px-4 py-3 text-white shadow-md duration-300 fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-bold tracking-wide uppercase">
                    {message}
                </p>
            </div>
            <button
                onClick={handleDismiss}
                className="rounded-full p-1 transition-colors hover:bg-white/20"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};

export default ErrorBanner;
