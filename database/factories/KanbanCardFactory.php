<?php

namespace Database\Factories;

use App\Models\KanbanCard;
use App\Models\KanbanColumn;
use Illuminate\Database\Eloquent\Factories\Factory;

class KanbanCardFactory extends Factory
{
    protected $model = KanbanCard::class;

    public function definition(): array
    {
        return [
            'column_id' => KanbanColumn::factory(),
            'title' => fake()->words(4, true),
            'description' => fake()->optional()->sentence(),
            'image_path' => null,
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
