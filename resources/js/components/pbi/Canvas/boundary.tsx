export function PageBoundaryOverlay({
    pageWidth,
    pageHeight,
    canvasWidth,
    canvasHeight,
}: {
    pageWidth: number;
    pageHeight: number;
    canvasWidth: number;
    canvasHeight: number;
}) {
    const edge = 'pointer-events-none absolute border-dashed border-black/80';
    const cols = Math.max(1, Math.floor(canvasWidth / pageWidth));
    const rows = Math.max(1, Math.floor(canvasHeight / pageHeight));
    const tiles = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            tiles.push({ left: c * pageWidth + 1, top: r * pageHeight + 1 });
        }
    }
    return (
        <>
            {tiles.map((t, i) => (
                <div
                    key={i}
                    className={edge}
                    style={{
                        left: t.left,
                        top: t.top,
                        width: Math.max(0, pageWidth - 2),
                        height: Math.max(0, pageHeight - 2),
                        borderWidth: 1,
                    }}
                />
            ))}
            <div
                className={`${edge} h-4 w-4 border-t-2 border-l-2`}
                style={{ left: 1, top: 1 }}
            />
            <div
                className={`${edge} h-4 w-4 border-t-2 border-r-2`}
                style={{ left: Math.max(1, pageWidth - 17), top: 1 }}
            />
            <div
                className={`${edge} h-4 w-4 border-b-2 border-l-2`}
                style={{ left: 1, top: Math.max(1, pageHeight - 17) }}
            />
            <div
                className={`${edge} h-4 w-4 border-r-2 border-b-2`}
                style={{
                    left: Math.max(1, pageWidth - 17),
                    top: Math.max(1, pageHeight - 17),
                }}
            />
        </>
    );
}