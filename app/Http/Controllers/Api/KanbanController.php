<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KanbanBoard;
use App\Models\KanbanCard;
use App\Models\KanbanColumn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class KanbanController extends Controller
{
    // ── Boards ──────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $boards = KanbanBoard::with('columns.cards')
            ->orderBy('created_at')
            ->get()
            ->map(fn (KanbanBoard $board) => $this->boardPayload($board));

        return response()->json($boards);
    }

    public function show(int $id): JsonResponse
    {
        $board = KanbanBoard::with('columns.cards')->find($id);

        if (! $board) {
            return response()->json(['message' => 'Board not found'], 404);
        }

        return response()->json($this->boardPayload($board));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $board = KanbanBoard::create(['name' => trim($validated['name'])]);

        return response()->json($this->boardPayload($board->load('columns.cards')), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $board = KanbanBoard::find($id);

        if (! $board) {
            return response()->json(['message' => 'Board not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $board->name = trim($validated['name']);
        $board->save();

        return response()->json($this->boardPayload($board->load('columns.cards')));
    }

    public function destroy(int $id): JsonResponse
    {
        $board = KanbanBoard::find($id);

        if (! $board) {
            return response()->json(['message' => 'Board not found'], 404);
        }

        $board->delete();

        return response()->json(['message' => 'Board deleted.']);
    }

    // ── Columns ─────────────────────────────────────────────────────────

    public function storeColumn(Request $request, int $boardId): JsonResponse
    {
        $board = KanbanBoard::find($boardId);

        if (! $board) {
            return response()->json(['message' => 'Board not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $column = KanbanColumn::create([
            'board_id' => $board->id,
            'name' => trim($validated['name']),
            'sort_order' => KanbanColumn::where('board_id', $board->id)->count(),
        ]);

        return response()->json($this->columnPayload($column->load('cards')), 201);
    }

    public function updateColumn(Request $request, int $id): JsonResponse
    {
        $column = KanbanColumn::find($id);

        if (! $column) {
            return response()->json(['message' => 'Column not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['name'])) {
            $column->name = trim($validated['name']);
        }

        if (array_key_exists('sort_order', $validated)) {
            $column->sort_order = $validated['sort_order'];
        }

        $column->save();

        return response()->json($this->columnPayload($column->load('cards')));
    }

    public function destroyColumn(int $id): JsonResponse
    {
        $column = KanbanColumn::find($id);

        if (! $column) {
            return response()->json(['message' => 'Column not found'], 404);
        }

        $column->delete();

        return response()->json(['message' => 'Column deleted.']);
    }

    public function reorderColumns(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer|distinct',
        ]);

        foreach (array_values($validated['order']) as $index => $columnId) {
            KanbanColumn::whereKey($columnId)->update(['sort_order' => $index]);
        }

        return response()->json(['message' => 'Columns reordered.']);
    }

    // ── Cards ───────────────────────────────────────────────────────────

    public function storeCard(Request $request, int $columnId): JsonResponse
    {
        $column = KanbanColumn::find($columnId);

        if (! $column) {
            return response()->json(['message' => 'Column not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $card = KanbanCard::create([
            'column_id' => $column->id,
            'title' => trim($validated['title']),
            'description' => $validated['description'] ?? null,
            'sort_order' => KanbanCard::where('column_id', $column->id)->count(),
        ]);

        return response()->json($this->cardPayload($card), 201);
    }

    public function updateCard(Request $request, int $id): JsonResponse
    {
        $card = KanbanCard::find($id);

        if (! $card) {
            return response()->json(['message' => 'Card not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        if (isset($validated['title'])) {
            $card->title = trim($validated['title']);
        }

        if (array_key_exists('description', $validated)) {
            $card->description = $validated['description'] !== null ? $validated['description'] : null;
        }

        $card->save();

        return response()->json($this->cardPayload($card));
    }

    public function destroyCard(int $id): JsonResponse
    {
        $card = KanbanCard::find($id);

        if (! $card) {
            return response()->json(['message' => 'Card not found'], 404);
        }

        $card->delete();

        return response()->json(['message' => 'Card deleted.']);
    }

    public function moveCard(Request $request, int $id): JsonResponse
    {
        $card = KanbanCard::find($id);

        if (! $card) {
            return response()->json(['message' => 'Card not found'], 404);
        }

        $validated = $request->validate([
            'column_id' => 'required|integer|exists:kanban_columns,id',
            'position' => 'nullable|integer|min:0',
        ]);

        $targetId = $validated['column_id'];
        $sourceId = $card->column_id;
        $card->column_id = $targetId;

        // Rebuild the target column's ordered list with the card inserted at `position`.
        $siblings = KanbanCard::where('column_id', $targetId)
            ->where('id', '!=', $card->id)
            ->orderBy('sort_order')
            ->get()
            ->values();

        $position = min($validated['position'] ?? $siblings->count(), $siblings->count());
        $siblings->splice($position, 0, [$card]);

        foreach ($siblings->values() as $index => $c) {
            if ($c->sort_order !== $index || $c->isDirty('column_id')) {
                $c->sort_order = $index;
                $c->save();
            }
        }

        // Compact the source column after the card left it.
        if ($sourceId !== $targetId) {
            KanbanCard::where('column_id', $sourceId)
                ->orderBy('sort_order')
                ->get()
                ->each(function (KanbanCard $c, int $index) {
                    if ($c->sort_order !== $index) {
                        $c->sort_order = $index;
                        $c->save();
                    }
                });
        }

        return response()->json($this->cardPayload($card));
    }

    // ── Images ──────────────────────────────────────────────────────────

    public function uploadImage(Request $request, int $id): JsonResponse
    {
        $card = KanbanCard::find($id);

        if (! $card) {
            return response()->json(['message' => 'Card not found'], 404);
        }

        $validated = $request->validate([
            'image' => 'required|file|image|mimes:jpg,jpeg,png,gif,webp|max:10240',
        ]);

        $path = $request->file('image')->store(
            'kanban/'.$card->id,
            'public'
        );

        $card->image_path = $path;
        $card->save();

        return response()->json($this->cardPayload($card));
    }

    public function showImage(int $id, string $filename)
    {
        $card = KanbanCard::find($id);

        if (! $card || ! $card->image_path) {
            abort(404);
        }

        if (! preg_match('/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp)$/i', $filename)) {
            abort(404);
        }

        if (basename($card->image_path) !== $filename) {
            abort(404);
        }

        if (! Storage::disk('public')->exists($card->image_path)) {
            abort(404);
        }

        return Storage::disk('public')->response($card->image_path, null, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private function imageUrl(KanbanCard $card): ?string
    {
        if (! $card->image_path) {
            return null;
        }

        return route('kanban.image', [
            'id' => $card->id,
            'filename' => basename($card->image_path),
        ]);
    }

    private function cardPayload(KanbanCard $card): array
    {
        return [
            'id' => $card->id,
            'column_id' => $card->column_id,
            'title' => $card->title,
            'description' => $card->description,
            'image_path' => $card->image_path,
            'image_url' => $this->imageUrl($card),
            'sort_order' => $card->sort_order,
            'created_at' => $card->created_at?->toISOString(),
            'updated_at' => $card->updated_at?->toISOString(),
        ];
    }

    private function columnPayload(KanbanColumn $column): array
    {
        return [
            'id' => $column->id,
            'board_id' => $column->board_id,
            'name' => $column->name,
            'sort_order' => $column->sort_order,
            'cards' => $column->relationLoaded('cards')
                ? $column->cards->map(fn (KanbanCard $card) => $this->cardPayload($card))->values()
                : [],
        ];
    }

    private function boardPayload(KanbanBoard $board): array
    {
        return [
            'id' => $board->id,
            'name' => $board->name,
            'created_at' => $board->created_at?->toISOString(),
            'updated_at' => $board->updated_at?->toISOString(),
            'columns' => $board->relationLoaded('columns')
                ? $board->columns->map(fn (KanbanColumn $column) => $this->columnPayload($column))->values()
                : [],
        ];
    }
}
