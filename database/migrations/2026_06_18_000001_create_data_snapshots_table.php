<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('table_name');
            $table->timestamp('snapshot_at');
            $table->integer('row_count')->default(0);
            $table->json('data');
            $table->timestamps();

            $table->index('table_name');
            $table->index('snapshot_at');
            $table->index(['table_name', 'snapshot_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_snapshots');
    }
};
