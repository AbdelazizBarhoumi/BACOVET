<?php

namespace Database\Factories;

use App\Models\BuilderPageV5;
use Illuminate\Database\Eloquent\Factories\Factory;

class BuilderPageV5Factory extends Factory
{
    protected $model = BuilderPageV5::class;

    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(2),
            'name' => fake()->words(3, true),
            'layout' => null,
            'group_id' => null,
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
