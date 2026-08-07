import { useEffect, useState } from 'react';
import { VisualView } from '@/components/pbi/VisualView';
import { visualTable } from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { POPUP_HEIGHT, POPUP_WIDTH } from './types';

/** Floating tooltip page shown on hover of a visual that has a tooltipPageId. */
export function TooltipPagePopup() {
    const { tooltipHover, pages, page, tableRows, rows } = usePbi();
    const [pos, setPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', move);
        return () => window.removeEventListener('mousemove', move);
    }, []);

    if (!tooltipHover) return null;
    const source = page.visuals.find((v) => v.id === tooltipHover.sourceId);
    const tooltipPage = source?.tooltipPageId
        ? pages.find((p) => p.id === source.tooltipPageId)
        : null;
    if (!tooltipPage) return null;

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