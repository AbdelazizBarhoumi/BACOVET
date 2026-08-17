<?php

namespace Tests\Unit;

use App\Support\ParameterVariants;
use PHPUnit\Framework\TestCase;

class ParameterVariantsTest extends TestCase
{
    public function test_expand_keeps_the_stored_url_as_the_default_variant(): void
    {
        $url = 'https://api.test/data/kpi/efficience-chaine?chaine=CH01&limit=100';

        $variants = ParameterVariants::expand($url, [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02', 'CH03']],
        ]);

        $this->assertSame([
            ['params' => [], 'url' => $url, 'default' => true],
            ['params' => ['chaine' => 'CH02'], 'url' => 'https://api.test/data/kpi/efficience-chaine?chaine=CH02&limit=100', 'default' => false],
            ['params' => ['chaine' => 'CH03'], 'url' => 'https://api.test/data/kpi/efficience-chaine?chaine=CH03&limit=100', 'default' => false],
        ], $variants);
    }

    public function test_expand_ignores_parameters_not_present_in_the_url(): void
    {
        $variants = ParameterVariants::expand('https://api.test/data/q/wip_chaine?chaine=CH01', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02']],
            ['name' => 'zone', 'values' => ['ZA', 'ZB']],
        ]);

        $this->assertCount(2, $variants);
        $this->assertArrayHasKey('chaine', $variants[1]['params']);
        $this->assertArrayNotHasKey('zone', $variants[1]['params']);
    }

    public function test_expand_builds_the_cartesian_product_for_multiple_parameters(): void
    {
        $variants = ParameterVariants::expand('https://api.test/data/x?chaine=CH01&zone=ZA', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02']],
            ['name' => 'zone', 'values' => ['ZA', 'ZB']],
        ]);

        $params = array_column($variants, 'params');
        $this->assertContains(['chaine' => 'CH01', 'zone' => 'ZB'], $params);
        $this->assertContains(['chaine' => 'CH02', 'zone' => 'ZA'], $params);
        $this->assertContains(['chaine' => 'CH02', 'zone' => 'ZB'], $params);
        // The combination identical to the stored URL (chaine=CH01&zone=ZA) is
        // deduplicated against the default variant, leaving default + 3 combos.
        $this->assertCount(4, $variants);
        $this->assertNotContains(['chaine' => 'CH01', 'zone' => 'ZA'], $params);
    }

    public function test_expand_respects_the_cap(): void
    {
        $values = array_map('strval', range(1, 500));

        $variants = ParameterVariants::expand('https://api.test/data/x?chaine=1', [
            ['name' => 'chaine', 'values' => $values],
        ], 50);

        $this->assertLessThanOrEqual(50, count($variants));
    }

    public function test_expand_returns_only_the_default_when_no_declared_values_match(): void
    {
        $variants = ParameterVariants::expand('https://api.test/data/x?chaine=CH01', [
            ['name' => 'chaine', 'values' => []],
        ]);

        $this->assertSame([
            ['params' => [], 'url' => 'https://api.test/data/x?chaine=CH01', 'default' => true],
        ], $variants);
    }

    public function test_with_query_appends_parameters_to_a_path_only_url(): void
    {
        $this->assertSame(
            'data/q/wip_chaine?chaine=CH02',
            ParameterVariants::withQuery('data/q/wip_chaine', ['chaine' => 'CH02']),
        );
    }

    public function test_with_query_overwrites_an_existing_parameter_and_preserves_the_rest(): void
    {
        $this->assertSame(
            'https://api.test/data/x?chaine=CH02&limit=10',
            ParameterVariants::withQuery('https://api.test/data/x?chaine=CH01&limit=10', ['chaine' => 'CH02']),
        );
    }
}
