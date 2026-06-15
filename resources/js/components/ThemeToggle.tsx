import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';

export function ThemeToggle() {
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const toggle = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            className="h-7 w-7 p-0"
            aria-label="Basculer le thème"
        >
            {resolvedAppearance === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
            ) : (
                <Moon className="h-3.5 w-3.5" />
            )}
        </Button>
    );
}

export default ThemeToggle;
