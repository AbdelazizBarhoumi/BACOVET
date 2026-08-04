import {
    ArrowDownRegular,
    ArrowRightRegular,
    ArrowUpRegular,
    CheckmarkCircleRegular,
    CircleRegular,
    DiamondRegular,
    DismissCircleRegular,
    EmojiRegular,
    ErrorCircleRegular,
    FireRegular,
    FlashRegular,
    HeartRegular,
    InfoRegular,
    MedalRegular,
    MoneyRegular,
    RocketRegular,
    SquareRegular,
    StarRegular,
    TargetRegular,
    TriangleRegular,
    TrophyRegular,
    WarningRegular,
} from '@fluentui/react-icons';
import { useMemo } from 'react';
import type { CFIcon, CFIconSet } from '@/lib/pbi/icons';
import { cn } from '@/lib/utils';

/**
 * Explicit map of the @fluentui/react-icons components used by the icon
 * registry. Every name here is verified against the installed package — a
 * missing registry entry simply falls back to the unicode glyph.
 */
const FLUENT_MAP: Record<string, React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
}> | undefined> = {
    ArrowUp: ArrowUpRegular,
    ArrowDown: ArrowDownRegular,
    ArrowRight: ArrowRightRegular,
    CheckmarkCircle: CheckmarkCircleRegular,
    DismissCircle: DismissCircleRegular,
    Warning: WarningRegular,
    ErrorCircle: ErrorCircleRegular,
    Info: InfoRegular,
    Star: StarRegular,
    Heart: HeartRegular,
    Fire: FireRegular,
    Flash: FlashRegular,
    Money: MoneyRegular,
    Rocket: RocketRegular,
    Trophy: TrophyRegular,
    Medal: MedalRegular,
    Circle: CircleRegular,
    Square: SquareRegular,
    Triangle: TriangleRegular,
    Diamond: DiamondRegular,
    Emoji: EmojiRegular,
    Target: TargetRegular,
};

export interface CfIconProps {
    icon: CFIcon | undefined;
    size?: number;
    className?: string;
}

/**
 * Renders a single conditional-formatting icon. Prefers a Fluent UI component
 * when `icon.fluent` is mapped, otherwise renders the unicode glyph in the
 * icon's stored color.
 */
export function CfIcon({ icon, size, className }: CfIconProps) {
    const { glyph, FluentIcon } = useMemo(() => {
        if (!icon) return { glyph: '●', FluentIcon: null };
        const Found = icon.fluent ? FLUENT_MAP[icon.fluent] : undefined;
        if (Found) return { glyph: '', FluentIcon: Found };
        return { glyph: icon.unicode, FluentIcon: null };
    }, [icon]);

    if (FluentIcon) {
        return (
            <FluentIcon
                className={cn(className)}
                style={{
                    fontSize: size,
                    width: size,
                    height: size,
                    color: icon?.color,
                }}
            />
        );
    }
    return (
        <span
            className={cn('inline-block', className)}
            style={{
                fontSize: size,
                width: size,
                height: size,
                color: icon?.color,
                lineHeight: 1,
            }}
            aria-label={icon?.label}
        >
            {glyph}
        </span>
    );
}

/** Picks the configured Fluent component size for dense table use. */
export function iconSizeForDensity(
    density: 'tight' | 'normal' | 'spacious' = 'tight',
): number {
    return { tight: 14, normal: 16, spacious: 18 }[density];
}

export function iconSetLabel(set: CFIconSet | undefined): string {
    return set?.label ?? 'Icons';
}
