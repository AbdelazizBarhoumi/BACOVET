import { useEffect, useState } from 'react';
import { VisualView } from '@/components/pbi/VisualView';
import { visualTable } from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { POPUP_HEIGHT, POPUP_WIDTH } from './types';

/** Floating tooltip page shown on hover of a visual that has a tooltipPageId. */
export function TooltipPagePopup() {
    const { tooltipHover, pages, page, tableRows, rows } = usePbi();
    const [pos, setPos] = useState({ x: 0, y: 0 });

    const source = tooltipHover
        ? page.visuals.find((v) => v.id === tooltipHover.sourceId)
        : undefined;
    const tooltipPage = source?.tooltipPageId
        ? pages.find((p) => p.id === source.tooltipPageId)
        : null;
    const hasPopup = !!tooltipPage;

    useEffect(() => {
        // No popup to position (no hover, or a dangling tooltipPageId):
        // don't subscribe at all. Previously this listener called setPos on
        // EVERY mousemove across the page even while rendering null, churning
        // a re-render per pixel into all nested visuals on hover-heavy pages.
        if (!hasPopup) return;
        // Coalesce bursts of mousemove events into one position update per
        // frame so fast mouse sweeps can't queue a render per pixel.
        let raf = 0;
        const move = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() =>
                setPos({ x: clientX, y: clientY }),
            );
        };
        window.addEventListener('mousemove', move);
        return () => {
            window.removeEventListener('mousemove', move);
            cancelAnimationFrame(raf);
        };
    }, [hasPopup]);

    if (!tooltipHover || !tooltipPage) return null;

    const tpVisuals = tooltipPage.visuals.filter((v) => !v.hidden);
    if (!tpVisuals.length) return null;

    const scale = Math.min(
        POPUP_WIDTH / tooltipPage.format.width,
        POPUP_HEIGHT / tooltipPage.format.height,
        1,
    );
    const x = Math.max(
        8,
        Math.min(pos.x + 14, window.innerWidth - POPUP_WIDTH - 8),
    );
    const y = Math.max(
        8,
        Math.min(pos.y + 14, window.innerHeight - POPUP_HEIGHT - 8),
    );

    return (
        <div
            className="pointer-events-none fixed z-50 overflow-hidden rounded border border-border bg-card shadow-xl"
            style={{
                left: x,
                top: y,
                width: POPUP_WIDTH,
                height: POPUP_HEIGHT,
                backgroundColor: tooltipPage.format.background,
            }}
        >
            <div
                className="relative"
                style={{
                    width: tooltipPage.format.width,
                    height: tooltipPage.format.height,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                }}
            >
                {tpVisuals.map((tv) => {
                    const base = tableRows[visualTable(tv)] ?? rows;
                    const hovered = base.filter(
                        (r) =>
                            String(r[tooltipHover.column]) ===
                            tooltipHover.value,
                    );
                    return (
                        <div
                            key={tv.id}
                            className="absolute p-1"
                            style={{
                                left: tv.x,
                                top: tv.y,
                                width: tv.w,
                                height: tv.h,
                            }}
                        >
                            <VisualView visual={tv} rows={hovered} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}