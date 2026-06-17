<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lt_transport_config', function (Blueprint $table) {
            $table->id();
            $table->string('destination', 100);
            $table->integer('lt_transport_jours')->default(0);
            $table->integer('strh_jours')->default(0);
            $table->integer('total_lt')->virtualAs('lt_transport_jours + strh_jours');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->unique('destination');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lt_transport_config');
    }
};
