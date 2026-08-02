<?php

namespace Database\Factories;

use App\Models\BuilderPageGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

class BuilderPageGroupFactory extends Factory
{
    protected $model = BuilderPageGroup::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'slug' => fake()->unique()->slug(2),
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
