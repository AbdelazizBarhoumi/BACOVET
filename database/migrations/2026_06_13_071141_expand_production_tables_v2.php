<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. minutes_presence table (F-REQ-201, 202, 204)
        if (! Schema::hasTable('minutes_presence')) {
            Schema::create('minutes_presence', function (Blueprint $table) {
                $table->id();
                $table->date('date');
                $table->string('chaine', 20)->nullable();
                $table->string('shift_code', 10)->nullable();
                $table->integer('minutes_presence')->default(0);
                $table->timestamp('synced_at')->useCurrent();

                $table->unique(['date', 'chaine', 'shift_code'], 'unique_presence');
            });
        }

        // 2. temps_operation table (F-REQ-210)
        if (! Schema::hasTable('temps_operation')) {
            Schema::create('temps_operation', function (Blueprint $table) {
                $table->id();
                $table->date('date')->nullable();
                $table->string('operation_code', 50)->nullable();
                $table->string('chaine', 20)->nullable();
                $table->decimal('temps_min', 8, 3)->default(0);
                $table->timestamp('synced_at')->useCurrent();

                $table->unique(['date', 'operation_code', 'chaine'], 'unique_op_time');
            });
        }

        // 3. Expand wip_chaine (F-REQ-212, 215, 306-308)
        Schema::table('wip_chaine', function (Blueprint $table) {
            if (! Schema::hasColumn('wip_chaine', 'designation')) {
                $table->string('designation', 300)->nullable()->after('article');
            }
            if (! Schema::hasColumn('wip_chaine', 'sot')) {
                $table->decimal('sot', 8, 2)->nullable()->after('sam');
            }
            if (! Schema::hasColumn('wip_chaine', 'bpd')) {
                $table->date('bpd')->nullable();
            }
            if (! Schema::hasColumn('wip_chaine', 'epd')) {
                $table->date('epd')->nullable();
            }
            if (! Schema::hasColumn('wip_chaine', 'ehd')) {
                $table->date('ehd')->nullable();
            }
        });

        // 4. Add unique constraints for upsert to tables needing history
        Schema::table('efficience_chaine', function (Blueprint $table) {
            $table->unique(['date', 'chaine'], 'unique_eff_chaine');
        });

        Schema::table('lost_time', function (Blueprint $table) {
            $table->unique(['date', 'chaine', 'motif'], 'unique_lost_time');
        });

        Schema::table('qte_produite', function (Blueprint $table) {
            $table->unique(['date', 'chaine', 'shift_code'], 'unique_qte_prod');
        });

        Schema::table('qte_produit_individuel_jour', function (Blueprint $table) {
            $table->unique(['date', 'employee_id', 'chaine', 'poste'], 'unique_indiv_prod');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('minutes_presence');
        Schema::dropIfExists('temps_operation');

        Schema::table('wip_chaine', function (Blueprint $table) {
            $table->dropColumn(['designation', 'sot', 'bpd', 'epd', 'ehd']);
        });

        Schema::table('efficience_chaine', function (Blueprint $table) {
            $table->dropUnique('unique_eff_chaine');
        });

        Schema::table('lost_time', function (Blueprint $table) {
            $table->dropUnique('unique_lost_time');
        });

        Schema::table('qte_produite', function (Blueprint $table) {
            $table->dropUnique('unique_qte_prod');
        });

        Schema::table('qte_produit_individuel_jour', function (Blueprint $table) {
            $table->dropUnique('unique_indiv_prod');
        });
    }
};
