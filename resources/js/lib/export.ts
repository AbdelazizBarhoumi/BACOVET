import * as XLSX from 'xlsx';

export function exportToCsv(filename: string, rows: Record<string, unknown>[], rawRows?: Record<string, unknown>[]) {
    const wb = XLSX.utils.book_new();

    if (!rows.length) {
        const ws = XLSX.utils.aoa_to_sheet([['(aucune donnée)']]);
        XLSX.utils.book_append_sheet(wb, ws, 'KPI Summary');
    } else {
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'KPI Summary');
    }

    if (rawRows && rawRows.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(rawRows);
        XLSX.utils.book_append_sheet(wb, ws2, 'Données brutes');
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}
