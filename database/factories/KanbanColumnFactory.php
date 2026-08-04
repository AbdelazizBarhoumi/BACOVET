<?php

namespace Database\Factories;

use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use Illuminate\Database\Eloquent\Factories\Factory;

class KanbanColumnFactory extends Factory
{
    protected $model = KanbanColumn::class;

    public function definition(): array
    {
        return [
            'board_id' => KanbanBoard::factory(),
            'name' => fake()->words(2, true),
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
