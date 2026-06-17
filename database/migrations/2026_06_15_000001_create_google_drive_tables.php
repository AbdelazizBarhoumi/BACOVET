<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // sync_drive_br_print
        Schema::create('sync_drive_br_print', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->integer('nb_inspections')->default(0);
            $table->integer('nb_rejets')->default(0);
            $table->string('source', 30)->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('date');
        });

        // sync_drive_br_care_label
        Schema::create('sync_drive_br_care_label', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->integer('nb_inspections')->default(0);
            $table->integer('nb_rejets')->default(0);
            $table->string('source', 30)->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('date');
        });

        // sync_drive_br_accessoires
        Schema::create('sync_drive_br_accessoires', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->integer('nb_inspections')->default(0);
            $table->integer('nb_rejets')->default(0);
            $table->string('source', 30)->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('date');
        });

        // sync_drive_br_compo
        Schema::create('sync_drive_br_compo', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->integer('nb_inspections')->default(0);
            $table->integer('nb_rejets')->default(0);
            $table->string('source', 30)->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('date');
        });

        // sync_drive_inspection_commande
        Schema::create('sync_drive_inspection_commande', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->integer('nb_inspections')->default(0);
            $table->integer('nb_rejets')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('date');
        });

        // sync_drive_dot_hot
        Schema::create('sync_drive_dot_hot', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('of', 50);
            $table->enum('type', ['DOT', 'HOT']);
            $table->integer('qte_commandee')->default(0);
            $table->integer('qte_livree_on_time')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['date', 'type']);
        });

        // sync_drive_development
        Schema::create('sync_drive_development', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('modele', 100);
            $table->enum('statut_validation', ['OK', 'NOK', 'PENDING'])->default('PENDING');
            $table->date('date_livraison_prevue')->nullable();
            $table->date('date_livraison_reelle')->nullable();
            $table->boolean('nomenclature_valide')->default(false);
            $table->boolean('est_reclamation')->default(false);
            $table->timestamp('synced_at')->useCurrent();
            $table->index('date');
        });

        // sync_drive_gammes
        Schema::create('sync_drive_gammes', function (Blueprint $table) {
            $table->id();
            $table->string('article', 100);
            $table->integer('nb_gammes_total')->default(0);
            $table->integer('nb_gammes_acceptees_v1')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('article');
        });

        // sync_drive_cotation
        Schema::create('sync_drive_cotation', function (Blueprint $table) {
            $table->id();
            $table->string('article', 100);
            $table->decimal('temps_cotation_min', 8, 2)->default(0);
            $table->decimal('temps_production_min', 8, 2)->default(0);
            $table->date('date');
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['article', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_drive_cotation');
        Schema::dropIfExists('sync_drive_gammes');
        Schema::dropIfExists('sync_drive_development');
        Schema::dropIfExists('sync_drive_dot_hot');
        Schema::dropIfExists('sync_drive_inspection_commande');
        Schema::dropIfExists('sync_drive_br_compo');
        Schema::dropIfExists('sync_drive_br_accessoires');
        Schema::dropIfExists('sync_drive_br_care_label');
        Schema::dropIfExists('sync_drive_br_print');
    }
};
