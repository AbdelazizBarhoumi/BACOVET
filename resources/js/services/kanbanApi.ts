export type KanbanCard = {
    id: number;
    column_id: number;
    title: string;
    description: string | null;
    image_path: string | null;
    image_url: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type KanbanColumn = {
    id: number;
    board_id: number;
    name: string;
    sort_order: number;
    cards: KanbanCard[];
};

export type KanbanBoard = {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    columns: KanbanColumn[];
};

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(options.body && !(options.body instanceof FormData)
            ? { 'Content-Type': 'application/json' }
            : {}),
        ...(options.headers as Record<string, string> | undefined),
    };

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
            const data = await res.json();
            message = data.message || message;
        } catch {
            /* keep default message */
        }
        throw new Error(message);
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}

const json = (method: string, body?: unknown): RequestInit => ({
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
});

// ── Boards ──────────────────────────────────────────────────────────────

export const listBoards = () => request<KanbanBoard[]>('/api/kanban/boards');

export const getBoard = (id: number) =>
    request<KanbanBoard>(`/api/kanban/boards/${id}`);

export const createBoard = (name: string) =>
    request<KanbanBoard>('/api/kanban/boards', json('POST', { name }));

export const updateBoard = (id: number, name: string) =>
    request<KanbanBoard>(`/api/kanban/boards/${id}`, json('PUT', { name }));

export const deleteBoard = (id: number) =>
    request<{ message: string }>(`/api/kanban/boards/${id}`, { method: 'DELETE' });

// ── Columns ─────────────────────────────────────────────────────────────

export const createColumn = (boardId: number, name: string) =>
    request<KanbanColumn>(
        `/api/kanban/boards/${boardId}/columns`,
        json('POST', { name }),
    );

export const updateColumn = (id: number, patch: Partial<Pick<KanbanColumn, 'name' | 'sort_order'>>) =>
    request<KanbanColumn>(`/api/kanban/columns/${id}`, json('PUT', patch));

export const deleteColumn = (id: number) =>
    request<{ message: string }>(`/api/kanban/columns/${id}`, { method: 'DELETE' });

export const reorderColumns = (order: number[]) =>
    request<{ message: string }>('/api/kanban/columns/reorder', json('PUT', { order }));

// ── Cards ───────────────────────────────────────────────────────────────

export const createCard = (columnId: number, title: string, description?: string | null) =>
    request<KanbanCard>(
        `/api/kanban/columns/${columnId}/cards`,
        json('POST', { title, description: description ?? null }),
    );

export const updateCard = (
    id: number,
    patch: Partial<Pick<KanbanCard, 'title' | 'description'>>,
) => request<KanbanCard>(`/api/kanban/cards/${id}`, json('PUT', patch));

export const deleteCard = (id: number) =>
    request<{ message: string }>(`/api/kanban/cards/${id}`, { method: 'DELETE' });

export const moveCard = (id: number, columnId: number, position: number) =>
    request<KanbanCard>(
        `/api/kanban/cards/${id}/move`,
        json('POST', { column_id: columnId, position }),
    );

// ── Images ──────────────────────────────────────────────────────────────

export const uploadCardImage = async (id: number, file: File): Promise<KanbanCard> => {
    const form = new FormData();
    form.append('image', file);
    return request<KanbanCard>(`/api/kanban/cards/${id}/images`, { method: 'POST', body: form });
};
