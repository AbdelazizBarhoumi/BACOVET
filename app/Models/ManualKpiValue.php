<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ManualKpiValue extends Model
{
    protected $fillable = [
        'kpi_key', 'kpi_label', 'numerator', 'denominator', 'value', 'note', 'updated_by'
    ];

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
