import { Download, Printer } from 'lucide-react';
import { useState } from 'react';
import * as XLSX from 'xlsx';

type ExportRow = Record<string, string | number | null>;

interface ExportButtonProps {
    rows: ExportRow[];
    filename: string;
    sheetName?: string;
    rawSheetData?: ExportRow[];
    rawSheetName?: string;
}

function formatDateFR(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ExportButton({
    rows,
    filename,
    sheetName = 'KPI Summary',
    rawSheetData,
    rawSheetName = 'Données brutes',
}: ExportButtonProps) {
    const [open, setOpen] = useState(false);

    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1 — KPI Summary
        const ws1 = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws1, sheetName);

        // Sheet 2 — Raw data (optional)
        if (rawSheetData && rawSheetData.length > 0) {
            const ws2 = XLSX.utils.json_to_sheet(rawSheetData);
            XLSX.utils.book_append_sheet(wb, ws2, rawSheetName);
        }

        const dateStr = formatDateFR();
        XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
        setOpen(false);
    };

    const handlePrint = () => {
        window.print();
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-1.5 rounded border border-border bg-secondary px-3 py-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase hover:bg-accent"
            >
                <Download className="h-3 w-3" />
                IMPRIMER RAPPORT
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded border border-border bg-card shadow-lg">
                    <button
                        onClick={handleExport}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs hover:bg-accent"
                    >
                        <Download className="h-3 w-3" />
                        Exporter Excel
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs hover:bg-accent"
                    >
                        <Printer className="h-3 w-3" />
                        Imprimer
                    </button>
                </div>
            )}
        </div>
    );
}
