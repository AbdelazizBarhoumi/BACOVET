import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import type { SharedColumn } from '@/services/endpointManagerApi';

function valueText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

function formatDateFR(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function SharedColumnsExportButton({
    columns,
}: {
    columns: SharedColumn[];
}) {
    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        const columnRows = columns.map((column) => ({
            Colonne: column.name,
            Type: column.type,
            Endpoints: column.endpoint_count,
            Sources: column.sources.join(', '),
            'Valeurs distinctes': column.distinct_values
                .map(valueText)
                .join(', '),
        }));
        const ws1 = XLSX.utils.json_to_sheet(columnRows);
        XLSX.utils.book_append_sheet(wb, ws1, 'Colonnes');

        const endpointRows = columns.flatMap((column) =>
            column.endpoints.map((endpoint) => ({
                Colonne: column.name,
                Endpoint: endpoint.entry_name,
                Slug: endpoint.slug,
                Source: endpoint.source,
                'Nombre de distinctes': endpoint.distinct_count,
            })),
        );
        const ws2 = XLSX.utils.json_to_sheet(endpointRows);
        XLSX.utils.book_append_sheet(wb, ws2, 'Endpoints');

        const dateStr = formatDateFR();
        XLSX.writeFile(wb, `shared_join_columns_${dateStr}.xlsx`);
    };

    return (
        <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={columns.length === 0}
            className="h-7 text-[10px] tracking-wider uppercase"
        >
            <Download className="mr-1 h-3 w-3" />
            Exporter
        </Button>
    );
}
