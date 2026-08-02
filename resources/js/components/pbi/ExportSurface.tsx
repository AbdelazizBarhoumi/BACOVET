import { useMemo } from 'react';
import { visualTable, isSlicerVisual, type Page } from '@/lib/pbi/model';
import { usePbi, visualTypeLabel } from '@/lib/pbi/store';
import { themeById, themeCssVars } from '@/lib/pbi/themes';
import { cn } from '@/lib/utils';
import { VisualView } from './VisualView';

// Replicates the Canvas visual layout (absolute positioning, border, shadow,
// title, fonts) but rendered off-screen so it can be rasterized for
// PDF / PNG / PPTX exports without disturbing the editor view.

export function ExportSurface({
    pages,
    ref,
}: {
    pages: Page[];
    ref?: React.Ref<HTMLDivElement>;
}) {
    const { rows, tableRows, tables, theme, customThemes } = usePbi();
    const activeTheme =
        customThemes.find((t) => t.id === theme) ?? themeById(theme);
    const style = useMemo(
        () => themeCssVars(activeTheme) as React.CSSProperties,
        [activeTheme],
    );

    return (
        <div
            ref={ref}
            aria-hidden
            className="pointer-events-none fixed top-0 left-[-99999px]"
            style={style}
        >
            {pages.map((page, pageIndex) => (
                <div
                    key={page.id}
                    data-export-page={pageIndex}
                    data-export-name={page.name}
                    className="relative overflow-hidden"
                    style={{
                        width: page.format.width,
                        height: page.format.height,
                        backgroundColor: page.format.background,
                    }}
                >
                    {!page.visuals.length && (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            Blank page
                        </div>
                    )}
                    {[...page.visuals]
                        .sort((a, b) => a.z - b.z)
                        .map((v) => {
                            if (v.hidden) return null;
                            const vRows = isSlicerVisual(v)
                                ? tables.find((t) => t.name === visualTable(v))?.rows ?? rows
                                : tableRows[visualTable(v)] ?? rows;
                            return (
                                <div
                                    key={v.id}
                                    data-export-visual={v.name || v.id}
                                    className={cn(
                                        'absolute flex flex-col rounded p-2',
                                        v.border && v.type !== 'shape' && 'border',
                                        v.shadow && 'shadow-md',
                                    )}
                                    style={{
                                        left: v.x,
                                        top: v.y,
                                        width: v.w,
                                        height: v.h,
                                        zIndex: v.z,
                                        backgroundColor:
                                            v.type === 'shape'
                                                ? 'transparent'
                                                : v.background,
                                        ...(v.border &&
                                        v.borderColor &&
                                        v.type !== 'shape'
                                            ? { borderColor: v.borderColor }
                                            : {}),
                                        ...(v.borderWidth && v.type !== 'shape'
                                            ? { borderWidth: v.borderWidth }
                                            : {}),
                                        ...(v.radius !== undefined &&
                                        v.radius !== null &&
                                        v.type !== 'shape'
                                            ? { borderRadius: v.radius }
                                            : {}),
                                        ...(v.fontFamily
                                            ? { fontFamily: v.fontFamily }
                                            : {}),
                                    }}
                                >
                                    <div className="flex items-center justify-between pb-1">
                                        <span
                                            className="truncate text-[11px] font-semibold text-foreground"
                                            style={{
                                                ...(v.fontColor
                                                    ? { color: v.fontColor }
                                                    : {}),
                                                ...(v.fontSize
                                                    ? { fontSize: v.fontSize }
                                                    : {}),
                                            }}
                                        >
                                            {v.showTitle
                                                ? v.title ||
                                                  visualTypeLabel(v.type)
                                                : ''}
                                        </span>
                                    </div>
                                    <div className="min-h-0 flex-1">
                                        <VisualView visual={v} rows={vRows} />
                                    </div>
                                </div>
                            );
                        })}
                </div>
            ))}
        </div>
    );
}
