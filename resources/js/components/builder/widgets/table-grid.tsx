import type { TableCell, TableGrid, WidgetConfig } from "../types";
import { boxStyle, wrap } from "./shared";

export function TableGridWidget({ c, editing, onCellSelect, selectedCells }: {
  c: WidgetConfig;
  editing: boolean;
  onCellSelect?: (r: number, c: number, add: boolean) => void;
  selectedCells?: string[];
}) {
  return wrap(c, boxStyle(c), <TableGridRenderer t={c.tableGrid!} editing={editing} onCellSelect={onCellSelect} selectedCells={selectedCells} />);
}

function TableGridRenderer({ t, editing, onCellSelect, selectedCells }: {
  t: TableGrid;
  editing: boolean;
  onCellSelect?: (r: number, c: number, add: boolean) => void;
  selectedCells?: string[];
}) {
  if (!t) return null;
  const isSel = (r: number, c: number) => selectedCells?.includes(`${r},${c}`);
  const colTemplate = t.colWidths?.length === t.cols
    ? t.colWidths.map((v) => `${v}fr`).join(" ")
    : `repeat(${t.cols}, minmax(0, 1fr))`;
  const rowTemplate = t.rowHeights?.length === t.rows
    ? t.rowHeights.map((v) => `${v}fr`).join(" ")
    : `repeat(${t.rows}, minmax(0, 1fr))`;

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < t.rows; r++) {
    for (let c = 0; c < t.cols; c++) {
      const cell: TableCell = t.cells.find((x) => x.r === r && x.c === c) ?? { r, c };
      if (cell.hidden) continue;
      const value = cell.kpiCode
        ? formatValue(cell)
        : cell.content ?? "";
      const isHead = cell.isHeader || (t.headerRow && r === 0) || (t.headerCol && c === 0);
      const zebra = t.zebra && !isHead && r % 2 === 1;
      cells.push(
        <div
          key={`${r},${c}`}
          className={`no-drag overflow-hidden text-xs px-2 py-1 flex items-center border border-border ${isSel(r, c) ? "outline outline-2 outline-primary z-10" : ""}`}
          style={{
            gridColumn: `${c + 1} / span ${cell.colSpan ?? 1}`,
            gridRow: `${r + 1} / span ${cell.rowSpan ?? 1}`,
            borderColor: t.borderColor,
            background: cell.bg ?? (isHead ? "var(--secondary)" : zebra ? "rgba(127,127,127,0.06)" : undefined),
            color: cell.fg,
            fontWeight: cell.fontWeight ?? (isHead ? 700 : undefined),
            fontSize: cell.fontSize,
            justifyContent: cell.align === "center" ? "center" : cell.align === "right" ? "flex-end" : "flex-start",
            textAlign: cell.align,
            cursor: editing ? "cell" : undefined,
          }}
          onClick={(e) => {
            if (!editing) return;
            e.stopPropagation();
            onCellSelect?.(r, c, e.shiftKey || e.ctrlKey || e.metaKey);
          }}
        >
          <span className="truncate w-full">{value || (editing ? <span className="text-muted-foreground/40">·</span> : "")}</span>
        </div>
      );
    }
  }

  return (
    <div className="h-full w-full grid" style={{ gridTemplateColumns: colTemplate, gridTemplateRows: rowTemplate }}>
      {cells}
    </div>
  );
}

function formatValue(cell: TableCell): string {
  if (!cell.kpiCode) return cell.content ?? "";
  return cell.kpiCode;
}
