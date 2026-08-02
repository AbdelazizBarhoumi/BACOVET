<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MeasureV5>
 */
class MeasureV5Factory extends Factory
{
    protected $model = \App\Models\MeasureV5::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->sentence(2),
            'expression' => 'Total = SUM(wip_chaine[WIP_Chaine])',
            'category' => null,
            'description' => null,
            'user_id' => null,
        ];
    }
}
