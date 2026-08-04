<?php

namespace Database\Factories;

use App\Models\KanbanBoard;
use Illuminate\Database\Eloquent\Factories\Factory;

class KanbanBoardFactory extends Factory
{
    protected $model = KanbanBoard::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
        ];
    }
}
