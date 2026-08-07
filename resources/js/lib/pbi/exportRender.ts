// DOM-capture export helpers: rasterize the offscreen export surface into
// PNG frames and assemble PDF / PPTX / single-image downloads. All heavy work
// is done sequentially with small awaits so large reports don't block the UI.

import { toPng } from 'html-to-image';

export type ExportProgress = (done: number, total: number, label: string) => void;

/** Generates an element-download filename with today's date. */
export function exportFilename(base: string, ext: string): string {
    const date = new Date().toISOString().slice(0, 10);
    return `${base}_${date}.${ext}`;
}

function downloadDataUrl(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

/**
 * Rasterizes a single DOM node at the given pixel scale.
 * `html-to-image` fails on nodes sized 0x0; we guard and fall back to the
 * node's bounding box.
 */
export async function captureElement(
    node: HTMLElement,
    scale = 2,
): Promise<string> {
    await document.fonts?.ready;
    const w = Math.max(node.offsetWidth || node.clientWidth, 1);
    const h = Math.max(node.offsetHeight || node.clientHeight, 1);
    return toPng(node, {
        pixelRatio: scale,
        width: w,
        height: h,
        cacheBust: true,
    });
}

/** Downloads a captured PNG frame. */
export function downloadPng(dataUrl: string, filename: string): void {
    downloadDataUrl(dataUrl, filename);
}

/** Combines PNG frames into a landscape PDF (one page per frame). */
export async function imagesToPdf(
    pngs: string[],
    progress?: ExportProgress,
): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1280, 720],
        compress: true,
    });
    for (let i = 0; i < pngs.length; i += 1) {
        if (i > 0) pdf.addPage([1280, 720], 'landscape');
        try {
            const img = await loadImage(pngs[i]!);
            const ratio = Math.min(1280 / img.width, 720 / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            pdf.addImage(
                pngs[i]!,
                'PNG',
                (1280 - w) / 2,
                (720 - h) / 2,
                w,
                h,
                undefined,
                'FAST',
            );
        } catch {
            // Skip unreadable frame rather than failing the whole export.
        }
        progress?.(i + 1, pngs.length, 'PDF');
        await nextFrame();
    }
    pdf.save(exportFilename('rapport', 'pdf'));
}

/** Builds a PowerPoint deck with one slide per page image. */
export async function imagesToPptx(
    pngs: string[],
    progress?: ExportProgress,
): Promise<void> {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    const unitW = 10;
    const unitH = 5.625;
    for (let i = 0; i < pngs.length; i += 1) {
        const slide = pptx.addSlide();
        try {
            const img = await loadImage(pngs[i]!);
            const ratio = Math.min(unitW / img.width, unitH / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            slide.addImage({
                data: pngs[i]!,
                x: (unitW - w) / 2,
                y: (unitH - h) / 2,
                w,
                h,
            });
        } catch {
            // Keep an empty slide rather than failing the whole export.
        }
        progress?.(i + 1, pngs.length, 'PowerPoint');
        await nextFrame();
    }
    await pptx.writeFile({ fileName: exportFilename('rapport', 'pptx') });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
    });
}

/** Yields to the browser so the progress UI can repaint. */
export function nextFrame(): Promise<void> {
    return new Promise((r) => requestAnimationFrame(() => r()));
}

/** Serial capture of an array of nodes with progress reporting. */
export async function captureNodes(
    nodes: HTMLElement[],
    scale: number,
    label: string,
    progress?: ExportProgress,
): Promise<string[]> {
    const out: string[] = [];
    for (let i = 0; i < nodes.length; i += 1) {
        progress?.(i, nodes.length, label);
        out.push(await captureElement(nodes[i]!, scale));
        await nextFrame();
    }
    return out;
}
