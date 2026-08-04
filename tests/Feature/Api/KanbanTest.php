<?php

namespace Tests\Feature\Api;

use App\Models\KanbanBoard;
use App\Models\KanbanCard;
use App\Models\KanbanColumn;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KanbanTest extends TestCase
{
    use RefreshDatabase;

    /** Minimal valid 1x1 transparent PNG (no GD extension required). */
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function pngFile(string $name = 'card.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode(self::PNG)
        );
    }

    // ── Boards ─────────────────────────────────────────────────────────

    public function test_index_lists_boards_with_columns_and_cards(): void
    {
        $board = KanbanBoard::factory()->create(['name' => 'Projet']);
        $column = KanbanColumn::factory()->create(['board_id' => $board->id, 'name' => 'Todo']);
        KanbanCard::factory()->create(['column_id' => $column->id, 'title' => 'Tâche A']);

        $response = $this->getJson('/api/kanban/boards');

        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.name', 'Projet');
        $response->assertJsonPath('0.columns.0.name', 'Todo');
        $response->assertJsonPath('0.columns.0.cards.0.title', 'Tâche A');
    }

    public function test_store_creates_board(): void
    {
        $response = $this->postJson('/api/kanban/boards', ['name' => 'Nouveau']);

        $response->assertStatus(201);
        $response->assertJsonPath('name', 'Nouveau');
        $this->assertDatabaseHas('kanban_boards', ['name' => 'Nouveau']);
    }

    public function test_store_requires_name(): void
    {
        $this->postJson('/api/kanban/boards', [])->assertStatus(422);
    }

    public function test_show_returns_board_by_id(): void
    {
        $board = KanbanBoard::factory()->create();

        $this->getJson("/api/kanban/boards/{$board->id}")->assertStatus(200)
            ->assertJsonPath('id', $board->id);
    }

    public function test_show_missing_board_returns_404(): void
    {
        $this->getJson('/api/kanban/boards/9999')->assertStatus(404);
    }

    public function test_update_renames_board(): void
    {
        $board = KanbanBoard::factory()->create(['name' => 'Old']);

        $this->putJson("/api/kanban/boards/{$board->id}", ['name' => 'New'])
            ->assertStatus(200)
            ->assertJsonPath('name', 'New');
    }

    public function test_destroy_deletes_board(): void
    {
        $board = KanbanBoard::factory()->create();
        $column = KanbanColumn::factory()->create(['board_id' => $board->id]);
        KanbanCard::factory()->create(['column_id' => $column->id]);

        $this->deleteJson("/api/kanban/boards/{$board->id}")->assertStatus(200);

        $this->assertDatabaseMissing('kanban_boards', ['id' => $board->id]);
        $this->assertDatabaseMissing('kanban_columns', ['id' => $column->id]);
        $this->assertDatabaseCount('kanban_cards', 0);
    }

    // ── Columns ────────────────────────────────────────────────────────

    public function test_store_column_appends_to_board(): void
    {
        $board = KanbanBoard::factory()->create();

        $response = $this->postJson("/api/kanban/boards/{$board->id}/columns", ['name' => 'Done']);

        $response->assertStatus(201);
        $response->assertJsonPath('name', 'Done');
        $this->assertDatabaseHas('kanban_columns', ['board_id' => $board->id, 'name' => 'Done']);
    }

    public function test_update_column_renames(): void
    {
        $column = KanbanColumn::factory()->create(['name' => 'Todo']);

        $this->putJson("/api/kanban/columns/{$column->id}", ['name' => 'WIP'])
            ->assertStatus(200)
            ->assertJsonPath('name', 'WIP');
    }

    public function test_reorder_columns(): void
    {
        $board = KanbanBoard::factory()->create();
        $a = KanbanColumn::factory()->create(['board_id' => $board->id, 'sort_order' => 0]);
        $b = KanbanColumn::factory()->create(['board_id' => $board->id, 'sort_order' => 1]);

        $this->putJson('/api/kanban/columns/reorder', ['order' => [$b->id, $a->id]])
            ->assertStatus(200);

        $this->assertDatabaseHas('kanban_columns', ['id' => $a->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('kanban_columns', ['id' => $b->id, 'sort_order' => 0]);
    }

    public function test_destroy_column_cascades_cards(): void
    {
        $column = KanbanColumn::factory()->create();
        KanbanCard::factory()->create(['column_id' => $column->id]);

        $this->deleteJson("/api/kanban/columns/{$column->id}")->assertStatus(200);

        $this->assertDatabaseMissing('kanban_columns', ['id' => $column->id]);
        $this->assertDatabaseCount('kanban_cards', 0);
    }

    // ── Cards ──────────────────────────────────────────────────────────

    public function test_store_card_in_column(): void
    {
        $column = KanbanColumn::factory()->create();

        $response = $this->postJson("/api/kanban/columns/{$column->id}/cards", [
            'title' => 'Tâche A',
            'description' => 'Description',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('title', 'Tâche A');
        $this->assertDatabaseHas('kanban_cards', ['column_id' => $column->id, 'title' => 'Tâche A']);
    }

    public function test_update_card(): void
    {
        $card = KanbanCard::factory()->create(['title' => 'Old']);

        $this->putJson("/api/kanban/cards/{$card->id}", [
            'title' => 'New',
            'description' => 'Updated',
        ])->assertStatus(200)
            ->assertJsonPath('title', 'New')
            ->assertJsonPath('description', 'Updated');
    }

    public function test_destroy_card(): void
    {
        $card = KanbanCard::factory()->create();

        $this->deleteJson("/api/kanban/cards/{$card->id}")->assertStatus(200);

        $this->assertDatabaseMissing('kanban_cards', ['id' => $card->id]);
    }

    public function test_move_card_across_columns_reorders_both(): void
    {
        $columnA = KanbanColumn::factory()->create();
        $columnB = KanbanColumn::factory()->create();
        $a1 = KanbanCard::factory()->create(['column_id' => $columnA->id, 'sort_order' => 0]);
        $a2 = KanbanCard::factory()->create(['column_id' => $columnA->id, 'sort_order' => 1]);
        $b1 = KanbanCard::factory()->create(['column_id' => $columnB->id, 'sort_order' => 0]);

        $this->postJson("/api/kanban/cards/{$a1->id}/move", [
            'column_id' => $columnB->id,
            'position' => 0,
        ])->assertStatus(200);

        $this->assertDatabaseHas('kanban_cards', ['id' => $a1->id, 'column_id' => $columnB->id, 'sort_order' => 0]);
        $this->assertDatabaseHas('kanban_cards', ['id' => $b1->id, 'column_id' => $columnB->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('kanban_cards', ['id' => $a2->id, 'column_id' => $columnA->id, 'sort_order' => 0]);
    }

    public function test_move_card_within_column_reorders(): void
    {
        $column = KanbanColumn::factory()->create();
        $a = KanbanCard::factory()->create(['column_id' => $column->id, 'sort_order' => 0]);
        $b = KanbanCard::factory()->create(['column_id' => $column->id, 'sort_order' => 1]);

        $this->postJson("/api/kanban/cards/{$a->id}/move", [
            'column_id' => $column->id,
            'position' => 1,
        ])->assertStatus(200);

        $this->assertDatabaseHas('kanban_cards', ['id' => $a->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('kanban_cards', ['id' => $b->id, 'sort_order' => 0]);
    }

    // ── Images ─────────────────────────────────────────────────────────

    public function test_upload_image_stores_file_and_updates_card(): void
    {
        $card = KanbanCard::factory()->create();

        $response = $this->postJson("/api/kanban/cards/{$card->id}/images", [
            'image' => $this->pngFile(),
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['image_url']);

        $url = $response->json('image_url');
        $this->assertStringContainsString('/api/kanban/cards/', $url);
        $this->assertStringContainsString('/images/', $url);

        $disk = Storage::disk('public');
        $files = $disk->allFiles('kanban/'.$card->id);
        $this->assertCount(1, $files);

        $card->refresh();
        $this->assertSame($files[0], $card->image_path);

        $filename = basename($files[0]);
        $this->getJson("/api/kanban/cards/{$card->id}/images/{$filename}")
            ->assertStatus(200);
    }

    public function test_invalid_mime_is_rejected(): void
    {
        $card = KanbanCard::factory()->create();

        $this->postJson("/api/kanban/cards/{$card->id}/images", [
            'image' => UploadedFile::fake()->createWithContent('notes.txt', 'plain text'),
        ])->assertStatus(422);

        $this->assertEmpty(Storage::disk('public')->allFiles('kanban/'.$card->id));
    }

    public function test_upload_for_missing_card_returns_404(): void
    {
        $this->postJson('/api/kanban/cards/9999/images', [
            'image' => $this->pngFile(),
        ])->assertStatus(404);
    }

    public function test_image_for_other_filename_is_rejected(): void
    {
        $card = KanbanCard::factory()->create(['image_path' => 'kanban/1/logo.png']);

        $this->getJson("/api/kanban/cards/{$card->id}/images/other.png")->assertStatus(404);
        $this->getJson("/api/kanban/cards/{$card->id}/images/..%2F..%2Fsecret.png")->assertStatus(404);
    }
}
