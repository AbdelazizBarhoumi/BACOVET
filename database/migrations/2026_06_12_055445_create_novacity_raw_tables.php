<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // M-051 — inline_endline_raw (raw Novacity tables)

        Schema::create('vw_item_trx', function (Blueprint $table) {
            $table->id();
            $table->json('raw_data');
            $table->timestamp('synced_at')->useCurrent();
        });

        Schema::create('item_trx_enq', function (Blueprint $table) {
            $table->id();
            $table->json('raw_data');
            $table->timestamp('synced_at')->useCurrent();
        });

        Schema::create('mp_data', function (Blueprint $table) {
            $table->id();
            $table->string('code_mp', 100)->nullable()->index();
            $table->string('designation', 300)->nullable();
            $table->string('famille', 100)->nullable();
            $table->json('extra_data')->nullable();
            $table->timestamp('synced_at')->useCurrent();
        });

        Schema::create('mp_conteneur', function (Blueprint $table) {
            $table->id();
            $table->string('code_mp', 100)->nullable()->index();
            $table->integer('nb_conteneurs')->default(0);
            $table->json('extra_data')->nullable();
            $table->timestamp('synced_at')->useCurrent();
        });

        Schema::create('mouvements', function (Blueprint $table) {
            $table->id();
            $table->date('date_mouvement')->nullable();
            $table->string('type_mouvement', 50)->nullable();
            $table->string('article', 100)->nullable();
            $table->integer('quantite')->default(0);
            $table->json('extra_data')->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index('date_mouvement');
        });

        Schema::create('lost_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('label', 200)->nullable();
            $table->json('extra_data')->nullable();
            $table->timestamp('synced_at')->useCurrent();
        });

        Schema::create('rover_effectiveness', function (Blueprint $table) {
            $table->id();
            $table->date('log_date')->nullable();
            $table->string('chaine', 20)->nullable();
            $table->decimal('effectiveness_pct', 6, 2)->default(0);
            $table->json('extra_data')->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index('log_date');
        });

        Schema::create('temps_operation', function (Blueprint $table) {
            $table->id();
            $table->date('date')->nullable();
            $table->string('operation_code', 50)->nullable();
            $table->string('chaine', 20)->nullable();
            $table->decimal('temps_min', 8, 3)->default(0);
            $table->json('extra_data')->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('temps_operation');
        Schema::dropIfExists('rover_effectiveness');
        Schema::dropIfExists('lost_types');
        Schema::dropIfExists('mouvements');
        Schema::dropIfExists('mp_conteneur');
        Schema::dropIfExists('mp_data');
        Schema::dropIfExists('item_trx_enq');
        Schema::dropIfExists('vw_item_trx');
    }
};
