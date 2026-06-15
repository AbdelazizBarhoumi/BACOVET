<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fix typo from previous migration: nb_ofconsideres → nb_of_consideres
        if (Schema::hasColumn('moyenne_date_transfert', 'nb_ofconsideres')) {
            Schema::table('moyenne_date_transfert', function (Blueprint $table) {
                $table->renameColumn('nb_ofconsideres', 'nb_of_consideres');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('moyenne_date_transfert', 'nb_of_consideres')) {
            Schema::table('moyenne_date_transfert', function (Blueprint $table) {
                $table->renameColumn('nb_of_consideres', 'nb_ofconsideres');
            });
        }
    }
};
