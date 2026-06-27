import { useEffect, useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFilters, type FilterState } from '@/context/FilterContext';

type FilterOptions = {
    marques: string[];
    ateliers: string[];
    lignes: string[];
    ofs: string[];
};

function getXsrfToken(): string {
    return decodeURIComponent(
        document.cookie
            .split('; ')
            .find((c) => c.startsWith('XSRF-TOKEN='))
            ?.split('=')[1] ?? '',
    );
}

async function fetchFilterOptions(): Promise<FilterOptions> {
    try {
        const res = await fetch('/filters/options', {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': getXsrfToken(),
            },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error('Failed to fetch filter options');
        return res.json();
    } catch {
        return { marques: [], ateliers: ['Confection', 'Coupe', 'Sérigraphie'], lignes: [], ofs: [] };
    }
}

const GlobalFilterBar = () => {
    const { filters, setFilter, resetFilters } = useFilters();
    const [options, setOptions] = useState<FilterOptions>({
        marques: [],
        ateliers: ['Confection', 'Coupe', 'Sérigraphie'],
        lignes: [],
        ofs: [],
    });

    useEffect(() => {
        fetchFilterOptions().then(setOptions);
    }, []);

    const filterDefs: { key: keyof FilterState; label: string; opts: string[] }[] = [
        {
            key: 'marque',
            label: 'Marque',
            opts: ['Toutes', ...options.marques],
        },
        {
            key: 'of',
            label: 'OF',
            opts: ['Tous', ...options.ofs],
        },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2">
            {filterDefs.map((f) => (
                <Select
                    key={f.key}
                    value={filters[f.key] || f.opts[0]}
                    onValueChange={(v) => setFilter(f.key, v)}
                >
                    <SelectTrigger className="h-8 w-[140px] border-border bg-secondary font-mono text-xs uppercase">
                        <span className="mr-1 text-muted-foreground">
                            {f.label}:
                        </span>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {f.opts.map((o) => (
                            <SelectItem
                                key={o}
                                value={o}
                                className="font-mono text-xs"
                            >
                                {o}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ))}
            <button
                onClick={resetFilters}
                className="h-8 rounded border border-border bg-secondary px-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase hover:bg-accent"
            >
                Réinitialiser
            </button>
        </div>
    );
};

export default GlobalFilterBar;
