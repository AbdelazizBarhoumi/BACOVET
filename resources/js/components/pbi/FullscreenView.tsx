import { ChevronLeft, ChevronRight, Minimize2, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { Canvas } from './Canvas';

const DRAG_THRESHOLD_PX = 10;
const SLIDE_RATIO = 0.2;
const SLIDE_MS = 240;
const DEFAULT_INTERVAL_SEC = 5;
const MIN_INTERVAL_SEC = 1;
const MAX_INTERVAL_SEC = 60;
const CONTROLS_HIDE_MS = 2500;

type Phase = 'idle' | 'slide-out' | 'slide-in';

/**
 * Presentation (kiosk) mode for the report. Renders only the canvas filling
 * the viewport and lets the reader swipe/drag horizontally (mouse or touch)
 * to slide between report pages, or use the on-screen chevrons, the page dots
 * or the arrow keys. Exiting (button or Escape) returns to the editor.
 */
export function FullscreenView() {
    const { pages, activePageId, setActivePage, setFullscreen, mobileView } =
        usePbi();
    const containerRef = useRef<HTMLDivElement>(null);
    const gestureRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        active: boolean;
    } | null>(null);
    const [offset, setOffset] = useState(0);
    const [phase, setPhase] = useState<Phase>('idle');
    const [transition, setTransition] = useState(false);
    const [playing, setPlaying] = useState(true);
    const [intervalSec, setIntervalSec] = useState(DEFAULT_INTERVAL_SEC);
    const [controlsVisible, setControlsVisible] = useState(true);
    const hideTimerRef = useRef<number | null>(null);

    const poke = useCallback(() => {
        setControlsVisible(true);
        if (hideTimerRef.current !== null) {
            window.clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = window.setTimeout(() => {
            setControlsVisible(false);
        }, CONTROLS_HIDE_MS);
    }, []);

    useEffect(() => {
        hideTimerRef.current = window.setTimeout(() => {
            setControlsVisible(false);
        }, CONTROLS_HIDE_MS);
        return () => {
            if (hideTimerRef.current !== null) {
                window.clearTimeout(hideTimerRef.current);
            }
        };
    }, []);

    const index = Math.max(
        0,
        pages.findIndex((p) => p.id === activePageId),
    );
    const widthRef = useRef(0);
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const measure = () => {
            widthRef.current = el.clientWidth;
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Phase 2: the new page is now active, start it off-screen on the side it
    // came from and animate it back to the resting position.
    const slideIn = useCallback((dir: 1 | -1) => {
        setTransition(false);
        setOffset(-dir * (widthRef.current || window.innerWidth));
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTransition(true);
                setPhase('slide-in');
                setOffset(0);
            });
        });
        window.setTimeout(() => {
            setPhase('idle');
            setTransition(false);
        }, SLIDE_MS + 60);
    }, []);

    // Phase 1: animate the current page off-screen in `dir`, switch the active
    // page, then run the slide-in phase.
    const commitSlide = useCallback(
        (dir: 1 | -1, target: number) => {
            const w = widthRef.current || window.innerWidth;
            setTransition(true);
            setPhase('slide-out');
            setOffset(dir * w);
            window.setTimeout(() => {
                const p = pages[target];
                if (p) setActivePage(p.id);
                slideIn(dir);
            }, SLIDE_MS);
        },
        [pages, setActivePage, slideIn],
    );

    const onPointerDown = (e: React.PointerEvent) => {
        if (phase !== 'idle') return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        gestureRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            active: false,
        };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const g = gestureRef.current;
        if (!g || g.pointerId !== e.pointerId || phase !== 'idle') return;
        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;
        if (!g.active) {
            if (Math.abs(dx) < DRAG_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy))
                return;
            g.active = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }
        const w = widthRef.current || window.innerWidth;
        const maxDrag = w * 0.5;
        setOffset(Math.max(-maxDrag, Math.min(maxDrag, dx)));
        e.preventDefault();
    };

    const onPointerUp = (e: React.PointerEvent) => {
        const g = gestureRef.current;
        if (!g || g.pointerId !== e.pointerId) return;
        const w = widthRef.current || window.innerWidth;
        const dx = e.clientX - g.startX;
        gestureRef.current = null;
        if (!g.active) {
            setOffset(0);
            return;
        }
        const canPrev = index > 0;
        const canNext = index < pages.length - 1;
        if (dx < -w * SLIDE_RATIO && canNext) {
            commitSlide(-1, index + 1);
        } else if (dx > w * SLIDE_RATIO && canPrev) {
            commitSlide(1, index - 1);
        } else {
            setTransition(true);
            setOffset(0);
            window.setTimeout(() => {
                setPhase('idle');
                setTransition(false);
            }, 240);
        }
    };

    const onPointerCancel = () => {
        gestureRef.current = null;
        setTransition(true);
        setOffset(0);
        window.setTimeout(() => {
            setPhase('idle');
            setTransition(false);
        }, 240);
    };

    const goTo = useCallback(
        (target: number) => {
            if (phase !== 'idle' || target === index) return;
            commitSlide(target > index ? 1 : -1, target);
        },
        [phase, index, commitSlide],
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setFullscreen(false);
            } else if (e.key === 'ArrowRight' && index < pages.length - 1) {
                goTo(index + 1);
            } else if (e.key === 'ArrowLeft' && index > 0) {
                goTo(index - 1);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [index, pages.length, setFullscreen, goTo]);

    // Autoplay: advances to the next page in an infinite loop while idle. The
    // timer is re-armed whenever the index or the phase changes, so manual
    // navigation resets the countdown but keeps playing.
    useEffect(() => {
        if (!playing || pages.length < 2 || phase !== 'idle') return;
        const id = window.setTimeout(() => {
            goTo((index + 1) % pages.length);
        }, intervalSec * 1000);
        return () => window.clearTimeout(id);
    }, [playing, intervalSec, index, pages.length, phase, goTo]);

    const page = pages[index];
    const animating = phase !== 'idle';

    return (
        <div
            data-testid="fullscreen-view"
            onPointerMove={poke}
            className="fixed inset-0 z-50 flex flex-col bg-muted text-foreground"
        >
            <div
                ref={containerRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                data-testid="fullscreen-canvas"
                className="relative flex min-h-0 flex-1 touch-pan-y select-none overflow-hidden"
            >
                <div
                    className={cn(
                        'relative flex h-full w-full items-center justify-center overflow-hidden',
                        transition && 'transition-transform ease-out duration-300',
                    )}
                    style={{ transform: `translateX(${offset}px)` }}
                >
                    <Canvas readOnly fit />
                </div>
            </div>

            <div
                className={cn(
                    'absolute top-3 left-3 flex items-center gap-2 transition-opacity duration-200',
                    controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
            >
                <div className="rounded bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur">
                    {page?.name} · {index + 1}/{pages.length}
                </div>
            </div>

            <div
                className={cn(
                    'absolute top-3 right-3 flex items-center gap-2 transition-opacity duration-200',
                    controlsVisible
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0',
                )}
            >
                <button
                    onClick={() => goTo(index - 1)}
                    disabled={index === 0 || animating}
                    className="grid size-8 place-items-center rounded bg-black/40 text-white backdrop-blur hover:bg-black/60 disabled:opacity-30"
                    aria-label="Page précédente"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <button
                    onClick={() => goTo(index + 1)}
                    disabled={index === pages.length - 1 || animating}
                    className="grid size-8 place-items-center rounded bg-black/40 text-white backdrop-blur hover:bg-black/60 disabled:opacity-30"
                    aria-label="Page suivante"
                >
                    <ChevronRight className="size-4" />
                </button>
                <button
                    onClick={() => setFullscreen(false)}
                    className="grid size-8 place-items-center rounded bg-black/40 text-white backdrop-blur hover:bg-black/60"
                    aria-label="Quitter le plein écran"
                >
                    <Minimize2 className="size-4" />
                </button>
            </div>

            {pages.length > 1 && (
                <div
                    className={cn(
                        'absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-200',
                        controlsVisible
                            ? 'pointer-events-auto opacity-100'
                            : 'pointer-events-none opacity-0',
                    )}
                >
                    <div className="flex items-center gap-1.5 rounded bg-black/40 px-2 py-1 backdrop-blur">
                        <button
                            onClick={() => setPlaying((p) => !p)}
                            className="grid size-6 place-items-center rounded text-white hover:bg-black/60"
                            aria-label={playing ? 'Mettre en pause' : 'Lecture automatique'}
                            title={playing ? 'Mettre en pause' : 'Lecture automatique'}
                        >
                            {playing ? (
                                <Pause className="size-3.5" />
                            ) : (
                                <Play className="size-3.5" />
                            )}
                        </button>
                        <input
                            type="number"
                            min={MIN_INTERVAL_SEC}
                            max={MAX_INTERVAL_SEC}
                            value={intervalSec}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v)) {
                                    setIntervalSec(
                                        Math.min(
                                            MAX_INTERVAL_SEC,
                                            Math.max(MIN_INTERVAL_SEC, v),
                                        ),
                                    );
                                }
                            }}
                            className="w-10 bg-transparent text-center text-[11px] text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            aria-label="Intervalle entre les pages (secondes)"
                        />
                        <span className="text-[10px] text-white/70">s</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {pages.map((p, i) => (
                            <button
                                key={p.id}
                                onClick={() => goTo(i)}
                                disabled={animating}
                                className={cn(
                                    'h-2 rounded-full transition-all',
                                    i === index
                                        ? 'w-5 bg-white'
                                        : 'w-2 bg-white/40 hover:bg-white/70',
                                )}
                                aria-label={`Aller à la page ${p.name}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {mobileView && (
                <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/40 px-2 py-1 text-[10px] text-white backdrop-blur">
                    Mode mobile
                </div>
            )}
        </div>
    );
}
