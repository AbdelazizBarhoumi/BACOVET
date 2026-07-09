<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // wip_chaine — API returns ProdGroup, etc.
        Schema::table('wip_chaine', function (Blueprint $table) {
            $cols = ['prod_group','of_no','chaine_name','wip','entree','sortie','objectif','sam','sot','bpd','epd','ehd'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('wip_chaine', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // etat_avancement — API returns many workflow stage columns
        Schema::table('etat_avancement', function (Blueprint $table) {
            $cols = ['of_no','prod_group','departage','sortie_coupe','sortie_montage','engagement',
                     'entree_chaine','sortie_serigraphie','envoie_serigraphie','conditionement',
                     'controle_qualite','embalage','vigniette_coupe'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('etat_avancement', $c)) {
                    $table->integer($c)->default(0)->after('id');
                }
            }
        });

        // efficience_chaine — API returns EfficiencePourcentage, ProdGroup, TempsPresence, TempsStandard
        Schema::table('efficience_chaine', function (Blueprint $table) {
            $cols = ['efficience_pourcentage','prod_group','temps_presence','temps_standard'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('efficience_chaine', $c)) {
                    $table->decimal($c, 10, 2)->nullable()->after('id');
                }
            }
        });

        // qte_produite — API returns Article, DateProduction, OfNo, QuantiteProduite
        Schema::table('qte_produite', function (Blueprint $table) {
            $cols = ['article','date_production','of_no','quantite_produite'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('qte_produite', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // lost_time — API returns LostTypeCode, LostTypeDesc, TotalLostTime
        Schema::table('lost_time', function (Blueprint $table) {
            $cols = ['lost_type_code','lost_type_desc','total_lost_time'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('lost_time', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // taging_reel — API returns Mono, ProdGroup, StatutTagging, TotalEmbalage, TotalEngagement
        Schema::table('taging_reel', function (Blueprint $table) {
            $cols = ['mono','prod_group','statut_tagging','total_embalage','total_engagement'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('taging_reel', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // packets_rejetes — API returns Jour, PacketAnnule, RfidIntrouvable
        Schema::table('packets_rejetes', function (Blueprint $table) {
            $cols = ['jour','packet_annule','rfid_introuvable'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('packets_rejetes', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // sortie_coupe — API returns DateProduction, OpNo, QuantiteSortieCoupe
        Schema::table('sortie_coupe', function (Blueprint $table) {
            $cols = ['date_production','op_no','quantite_sortie_coupe'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('sortie_coupe', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // qte_engagement — API returns DateEngagement, OpNo, QuantiteEngagement
        Schema::table('qte_engagement', function (Blueprint $table) {
            $cols = ['date_engagement','op_no','quantite_engagement'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('qte_engagement', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // qte_entree_serigraphie — API returns Chaine, DateEntreeSerigraphie, OfNo, QuantiteEntreeSerigraphie
        Schema::table('qte_entree_serigraphie', function (Blueprint $table) {
            $cols = ['chaine','date_entree_serigraphie','of_no','quantite_entree_serigraphie'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('qte_entree_serigraphie', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // sortie_serigraphie — API returns Commande, DateSerigraphie, OpNo, QuantiteSortieSerigraphie
        Schema::table('sortie_serigraphie', function (Blueprint $table) {
            $cols = ['commande','date_serigraphie','op_no','quantite_sortie_serigraphie'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('sortie_serigraphie', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // inline_vs_endline_comparison — API returns many new columns
        Schema::table('inline_vs_endline_comparison', function (Blueprint $table) {
            $intCols = ['endline_defect_qty','endline_inspected_qty',
                     'operationno','roving_defect_qty','roving_sample_qty'];
            foreach ($intCols as $c) {
                if (!Schema::hasColumn('inline_vs_endline_comparison', $c)) {
                    $table->integer($c)->default(0)->after('id');
                }
            }
            // mono: API sends large numeric strings with trailing spaces, use VARCHAR
            if (!Schema::hasColumn('inline_vs_endline_comparison', 'mono')) {
                $table->string('mono', 50)->nullable()->after('id');
            }
        });

        // qte_produit_individuel_jour — API returns DateProduction, EmployeeName, EmployeeNo, QuantiteProduite
        Schema::table('qte_produit_individuel_jour', function (Blueprint $table) {
            $cols = ['date_production','employee_name','employee_no','quantite_produite'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('qte_produit_individuel_jour', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // qte_depart_chaine_article_of — API returns Article, Chaine, DateDepartage, OfNo, QuantiteDepartage
        Schema::table('qte_depart_chaine_article_of', function (Blueprint $table) {
            $cols = ['article','chaine','date_departage','of_no','quantite_departage'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('qte_depart_chaine_article_of', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // minutes_presence — API returns EmployeeName, EmployeeNo, ProdGroup, TempsPresenceMin
        Schema::table('minutes_presence', function (Blueprint $table) {
            $cols = ['employee_name','employee_no','prod_group','temps_presence_min'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('minutes_presence', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // minutes_produites — API returns EmployeeName, EmployeeNo, MinuteProduite, ProdGroup, TotalQuantite
        Schema::table('minutes_produites', function (Blueprint $table) {
            $cols = ['employee_name','employee_no','minute_produite','prod_group','total_quantite'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('minutes_produites', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // temps_operation — API returns OpCode, OpNo, ProdGroup, TempsOperation
        Schema::table('temps_operation', function (Blueprint $table) {
            $cols = ['op_code','op_no','prod_group','temps_operation'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('temps_operation', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // colis_total_var — API returns ColisAnnules, ColisValides, RfidIntrouvable, TotalRejetes
        Schema::table('colis_total_var', function (Blueprint $table) {
            $cols = ['colis_annules','colis_valides','rfid_introuvable','total_rejetes'];
            foreach ($cols as $c) {
                if (!Schema::hasColumn('colis_total_var', $c)) {
                    $table->string($c, 100)->nullable()->after('id');
                }
            }
        });

        // qcm_defect_trx — make item_id nullable (API doesn't always send it)
        Schema::table('qcm_defect_trx', function (Blueprint $table) {
            if (Schema::hasColumn('qcm_defect_trx', 'item_id')) {
                $table->string('item_id', 100)->nullable()->change();
            }
        });
    }

    public function down(): void
    {
        // This migration is additive; rollback is not critical for production
    }
};
