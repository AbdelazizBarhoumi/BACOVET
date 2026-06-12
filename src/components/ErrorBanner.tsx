import { AlertCircle, X } from "lucide-react";
import { useState } from "react";

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
    <div className="bg-status-red text-white px-4 py-3 rounded-md shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-bold uppercase tracking-wide">{message}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="hover:bg-white/20 p-1 rounded-full transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ErrorBanner;
