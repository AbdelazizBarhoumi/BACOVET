import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { normalizeRoot } from '@/lib/endpoint-roots';

/**
 * Editable root field: free text input with known roots as suggestions.
 *
 * - Empty value means "use the default root" (legacy behaviour).
 * - Typing a known root selects that group.
 * - Typing a different https:// URL creates a new group on save
 *   (groups are derived from data.json, so no extra step is needed).
 */
export function RootCombobox({
    value,
    defaultRoot = '',
    roots = [],
    onChange,
    placeholder,
    hintVariant = 'default',
}: {
    value: string;
    defaultRoot?: string;
    roots?: string[];
    onChange: (next: string) => void;
    placeholder?: string;
    hintVariant?: 'default' | 'compact';
}) {
    const listId = `root-suggestions-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const trimmed = value.trim();
    const normalized = trimmed ? normalizeRoot(trimmed) : '';
    const knownSet = new Set(roots.map((root) => normalizeRoot(root)));
    const isCustomRoot = normalized !== '' && !knownSet.has(normalized);
    const isDefault = trimmed === '';

    const suggestions = [...new Set(roots)].sort((a, b) =>
        a.localeCompare(b),
    );

    return (
        <div className="space-y-1.5">
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={
                    placeholder ??
                    (defaultRoot ? defaultRoot : 'https://api.example.com')
                }
                className="font-mono text-sm"
                list={listId}
                autoComplete="off"
                spellCheck={false}
            />
            <datalist id={listId}>
                {defaultRoot && (
                    <option value={defaultRoot}>
                        Racine par défaut
                    </option>
                )}
                {suggestions.map((root) => (
                    <option key={root} value={root} />
                ))}
            </datalist>
            {isDefault && defaultRoot ? (
                <p className="text-[10px] text-muted-foreground">
                    Vide = racine par défaut :{' '}
                    <span className="font-mono">{defaultRoot}</span>
                </p>
            ) : null}
            {isCustomRoot ? (
                <p
                    className={
                        hintVariant === 'compact'
                            ? 'text-[10px] text-muted-foreground'
                            : 'text-[10px] font-medium text-warning'
                    }
                >
                    Nouvelle racine — un nouvel onglet sera créé après
                    enregistrement.
                </p>
            ) : null}
        </div>
    );
}
