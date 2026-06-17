<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LtTransportConfig extends Model
{
    protected $table = 'lt_transport_config';

    protected $fillable = [
        'destination', 'lt_transport_jours', 'strh_jours', 'updated_by',
    ];

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
