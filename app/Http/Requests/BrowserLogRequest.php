<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BrowserLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        // allow all browser clients to post logs
        return true;
    }

    public function rules(): array
    {
        return [
            'level' => ['required', 'string', Rule::in(['log', 'info', 'warn', 'warning', 'error', 'debug'])],
            'message' => ['required', 'string', 'max:2000'],
            'url' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
