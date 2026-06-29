import { useAppearance } from '@/hooks/use-appearance';

export function useTheme() {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    return {
        theme: resolvedAppearance,
        toggle: () =>
            updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark'),
    };
}
