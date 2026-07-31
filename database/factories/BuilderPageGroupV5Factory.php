<?php

namespace Database\Factories;

use App\Models\BuilderPageGroupV5;
use Illuminate\Database\Eloquent\Factories\Factory;

class BuilderPageGroupV5Factory extends Factory
{
    protected $model = BuilderPageGroupV5::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'slug' => fake()->unique()->slug(2),
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
