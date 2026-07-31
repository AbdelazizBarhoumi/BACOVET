import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { stringifyValue } from '@/lib/json-utils';
import type { EndpointEntry, EndpointPayload } from '@/services/endpointManagerApi';
import { JsonEditor } from './JsonEditor';

type FieldErrors = Partial<
    Record<'name' | 'endpoint' | 'status' | 'response', string>
>;

const URL_RE = /^https?:\/\/.+/i;

function FormFields({
    entry,
    busy,
    onCancel,
    onSubmit,
}: {
    entry?: EndpointEntry | null;
    busy: boolean;
    onCancel: () => void;
    onSubmit: (payload: EndpointPayload) => void;
}) {
    const [name, setName] = useState(entry?.name ?? '');
    const [method, setMethod] = useState<'GET' | 'POST'>(entry?.method ?? 'GET');
    const [endpoint, setEndpoint] = useState(entry?.endpoint ?? '');
    const [status, setStatus] = useState(entry ? String(entry.status) : '200');
    const [responseText, setResponseText] = useState(
        entry ? stringifyValue(entry.response) : '{\n    "success": true\n}',
    );
    const [errors, setErrors] = useState<FieldErrors>({});

    const validate = (): FieldErrors => {
        const next: FieldErrors = {};
        if (!name.trim()) {
            next.name = 'Name is required';
        }
        if (!endpoint.trim()) {
            next.endpoint = 'Endpoint URL is required';
        } else if (!URL_RE.test(endpoint.trim())) {
            next.endpoint = 'Must be a valid http(s) URL';
        }
        const statusNum = Number(status);
        if (!Number.isInteger(statusNum) || statusNum < 100 || statusNum > 599) {
            next.status = 'Status must be an integer between 100 and 599';
        }
        try {
            JSON.parse(responseText);
        } catch (err) {
            next.response =
                err instanceof Error ? err.message : 'Response is not valid JSON';
        }
        return next;
    };

    const handleSubmit = () => {
        const nextErrors = validate();
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            return;
        }
        onSubmit({
            name: name.trim(),
            method,
            endpoint: endpoint.trim(),
            status: Number(status),
            response: JSON.parse(responseText),
        });
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Name
                    </Label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. 01 — ItemTrxEnq (SDT)"
                        className="font-mono text-sm"
                    />
                    {errors.name && (
                        <p className="text-[10px] font-medium text-destructive">
                            {errors.name}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Method
                    </Label>
                    <Select
                        value={method}
                        onValueChange={(value) => setMethod(value as 'GET' | 'POST')}
                    >
                        <SelectTrigger className="font-mono">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Status code
                    </Label>
                    <Input
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        inputMode="numeric"
                        className="font-mono"
                    />
                    {errors.status && (
                        <p className="text-[10px] font-medium text-destructive">
                            {errors.status}
                        </p>
                    )}
                </div>

                <div className="col-span-2 space-y-1.5">
                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Endpoint URL
                    </Label>
                    <Input
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        placeholder="https://bacovet.eu1.netbird.services/api/data/itemtrxenq"
                        className="font-mono text-sm"
                    />
                    {errors.endpoint && (
                        <p className="text-[10px] font-medium text-destructive">
                            {errors.endpoint}
                        </p>
                    )}
                </div>

                <div className="col-span-2">
                    <JsonEditor value={responseText} onChange={setResponseText} />
                    {errors.response && (
                        <p className="mt-1 text-[10px] font-medium text-destructive">
                            {errors.response}
                        </p>
                    )}
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onCancel} disabled={busy}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {entry ? 'Save changes' : 'Create endpoint'}
                </Button>
            </DialogFooter>
        </>
    );
}

export function EndpointFormDialog({
    open,
    onOpenChange,
    entry,
    busy = false,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry?: EndpointEntry | null;
    busy?: boolean;
    onSubmit: (payload: EndpointPayload) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-mono text-sm tracking-wider uppercase">
                        {entry ? 'Edit endpoint' : 'New endpoint'}
                    </DialogTitle>
                </DialogHeader>

                <FormFields
                    key={entry?.id ?? 'new'}
                    entry={entry}
                    busy={busy}
                    onCancel={() => onOpenChange(false)}
                    onSubmit={onSubmit}
                />
            </DialogContent>
        </Dialog>
    );
}
