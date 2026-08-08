<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Schedule webhook
    |--------------------------------------------------------------------------
    |
    | `enabled` turns the GET /schedule/run webhook on/off.
    | `token` is the secret that must be passed as the `token` query parameter
    | or the `X-Schedule-Token` header for the webhook to run the scheduler.
    | It is read from the SCHEDULE_WEBHOOK_TOKEN env variable. When it is
    | null/empty every run request is refused (fail-closed).
    |
    */

    'enabled' => env('SCHEDULE_WEBHOOK_ENABLED', true),

    'token' => env('SCHEDULE_WEBHOOK_TOKEN'),
];