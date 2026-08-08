<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_login_returns_a_successful_response(): void
    {
        $response = $this->get(route('login'));

        $response->assertOk();
    }
}
