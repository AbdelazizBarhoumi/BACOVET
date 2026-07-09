<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // wip_chaine — API returns: ProdGroup, WIP_Chaine
        Schema::table('wip_chaine', function (Blueprint $table) {
            if (! Schema::hasColumn('wip_chaine', 'prod_group')) {
                $table->string('prod_group', 50)->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('wip_chaine', 'wip_chaine')) {
                $table->integer('wip_chaine')->default(0)->after('prod_group');
            }
        });

        // etat_avancement — API returns: OF_No, ProdGroup, departage, vigniette_coupe, envoie_serigraphie, sortie_serigraphie, sortie_coupe, entree_chaine, engagement, sortie_montage, controle_qualite, conditionement, embalage
        Schema::table('etat_avancement', function (Blueprint $table) {
            if (! Schema::hasColumn('etat_avancement', 'of_no')) {
                $table->string('of_no', 50)->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('etat_avancement', 'prod_group')) {
                $table->string('prod_group', 50)->nullable()->after('of_no');
            }
            if (! Schema::hasColumn('etat_avancement', 'departage')) {
                $table->integer('departage')->default(0)->after('prod_group');
            }
            if (! Schema::hasColumn('etat_avancement', 'vigniette_coupe')) {
                $table->integer('vigniette_coupe')->default(0)->after('departage');
            }
            if (! Schema::hasColumn('etat_avancement', 'envoie_serigraphie')) {
                $table->integer('envoie_serigraphie')->default(0)->after('vigniette_coupe');
            }
            if (! Schema::hasColumn('etat_avancement', 'sortie_serigraphie')) {
                $table->integer('sortie_serigraphie')->default(0)->after('envoie_serigraphie');
            }
            if (! Schema::hasColumn('etat_avancement', 'sortie_coupe')) {
                $table->integer('sortie_coupe')->default(0)->after('sortie_serigraphie');
            }
            if (! Schema::hasColumn('etat_avancement', 'entree_chaine')) {
                $table->integer('entree_chaine')->default(0)->after('sortie_coupe');
            }
            if (! Schema::hasColumn('etat_avancement', 'engagement')) {
                $table->integer('engagement')->default(0)->after('entree_chaine');
            }
            if (! Schema::hasColumn('etat_avancement', 'sortie_montage')) {
                $table->integer('sortie_montage')->default(0)->after('engagement');
            }
            if (! Schema::hasColumn('etat_avancement', 'controle_qualite')) {
                $table->integer('controle_qualite')->default(0)->after('sortie_montage');
            }
            if (! Schema::hasColumn('etat_avancement', 'conditionement')) {
                $table->integer('conditionement')->default(0)->after('controle_qualite');
            }
            if (! Schema::hasColumn('etat_avancement', 'embalage')) {
                $table->integer('embalage')->default(0)->after('conditionement');
            }
        });

        // efficience_chaine — API returns: ProdGroup, TempsStandard, TempsPresence, Efficience_Pourcentage
        Schema::table('efficience_chaine', function (Blueprint $table) {
            if (! Schema::hasColumn('efficience_chaine', 'prod_group')) {
                $table->string('prod_group', 50)->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('efficience_chaine', 'temps_standard')) {
                $table->decimal('temps_standard', 10, 2)->nullable()->after('prod_group');
            }
            if (! Schema::hasColumn('efficience_chaine', 'temps_presence')) {
                $table->decimal('temps_presence', 10, 2)->nullable()->after('temps_standard');
            }
            if (! Schema::hasColumn('efficience_chaine', 'efficience_pourcentage')) {
                $table->decimal('efficience_pourcentage', 10, 2)->nullable()->after('temps_presence');
            }
        });

        // qte_produite — API returns: DateProduction, OF_No, Article, Chaine, Quantite_Produite
        Schema::table('qte_produite', function (Blueprint $table) {
            if (! Schema::hasColumn('qte_produite', 'date_production')) {
                $table->date('date_production')->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('qte_produite', 'of_no')) {
                $table->string('of_no', 50)->nullable()->after('date_production');
            }
            if (! Schema::hasColumn('qte_produite', 'article')) {
                $table->string('article', 100)->nullable()->after('of_no');
            }
            if (! Schema::hasColumn('qte_produite', 'quantite_produite')) {
                $table->integer('quantite_produite')->default(0)->after('quantite');
            }
        });

        // lost_time — API returns: LostTypeCode, LostTypeDesc, TotalLostTime
        Schema::table('lost_time', function (Blueprint $table) {
            if (! Schema::hasColumn('lost_time', 'lost_type_code')) {
                $table->string('lost_type_code', 50)->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('lost_time', 'lost_type_desc')) {
                $table->string('lost_type_desc', 200)->nullable()->after('lost_type_code');
            }
            if (! Schema::hasColumn('lost_time', 'total_lost_time')) {
                $table->integer('total_lost_time')->default(0)->after('lost_type_desc');
            }
        });

        // taging_reel — API returns: MONo, ProdGroup, TotalEngagement, TotalEmbalage, StatutTagging
        Schema::table('taging_reel', function (Blueprint $table) {
            if (! Schema::hasColumn('taging_reel', 'mono')) {
                $table->string('mono', 50)->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('taging_reel', 'prod_group')) {
                $table->string('prod_group', 50)->nullable()->after('mono');
            }
            if (! Schema::hasColumn('taging_reel', 'total_engagement')) {
                $table->integer('total_engagement')->default(0)->after('prod_group');
            }
            if (! Schema::hasColumn('taging_reel', 'total_embalage')) {
                $table->integer('total_embalage')->default(0)->after('total_engagement');
            }
            if (! Schema::hasColumn('taging_reel', 'statut_tagging')) {
                $table->string('statut_tagging', 100)->nullable()->after('total_embalage');
            }
        });

        // packets_rejetes — API returns: Jour, RFID_introuvable, Packet_annule
        Schema::table('packets_rejetes', function (Blueprint $table) {
            if (! Schema::hasColumn('packets_rejetes', 'jour')) {
                $table->date('jour')->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('packets_rejetes', 'rfid_introuvable')) {
                $table->integer('rfid_introuvable')->default(0)->after('jour');
            }
            if (! Schema::hasColumn('packets_rejetes', 'packet_annule')) {
                $table->integer('packet_annule')->default(0)->after('rfid_introuvable');
            }
        });

        // sortie_coupe — API returns: DateProduction, Commande, OpNo, Quantite_Sortie_Coupe
        Schema::table('sortie_coupe', function (Blueprint $table) {
            if (! Schema::hasColumn('sortie_coupe', 'date_production')) {
                $table->date('date_production')->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('sortie_coupe', 'op_no')) {
                $table->string('op_no', 50)->nullable()->after('commande');
            }
            if (! Schema::hasColumn('sortie_coupe', 'quantite_sortie_coupe')) {
                $table->integer('quantite_sortie_coupe')->default(0)->after('quantite_coupee');
            }
        });

        // qte_engagement — API returns: DateEngagement, Commande, OpNo, Quantite_Engagement
        Schema::table('qte_engagement', function (Blueprint $table) {
            if (! Schema::hasColumn('qte_engagement', 'date_engagement')) {
                $table->date('date_engagement')->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('qte_engagement', 'op_no')) {
                $table->string('op_no', 50)->nullable()->after('commande');
            }
            if (! Schema::hasColumn('qte_engagement', 'quantite_engagement')) {
                $table->integer('quantite_engagement')->default(0)->after('quantite_engagee');
            }
        });

        // qte_entree_serigraphie — API returns: DateEntreeSerigraphie, OF_No, Article, Chaine, Quantite_Entree_Serigraphie
        Schema::table('qte_entree_serigraphie', function (Blueprint $table) {
            if (! Schema::hasColumn('qte_entree_serigraphie', 'date_entree_serigraphie')) {
                $table->date('date_entree_serigraphie')->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('qte_entree_serigraphie', 'of_no')) {
                $table->string('of_no', 50)->nullable()->after('date_entree_serigraphie');
            }
            if (! Schema::hasColumn('qte_entree_serigraphie', 'chaine')) {
                $table->string('chaine', 50)->nullable()->after('of_no');
            }
            if (! Schema::hasColumn('qte_entree_serigraphie', 'quantite_entree_serigraphie')) {
                $table->integer('quantite_entree_serigraphie')->default(0)->after('quantite');
            }
        });

        // sortie_serigraphie — API returns: DateSerigraphie, Commande, OpNo, Quantite_Sortie_Serigraphie
        Schema::table('sortie_serigraphie', function (Blueprint $table) {
            if (! Schema::hasColumn('sortie_serigraphie', 'date_serigraphie')) {
                $table->date('date_serigraphie')->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('sortie_serigraphie', 'op_no')) {
                $table->string('op_no', 50)->nullable()->after('article');
            }
            if (! Schema::hasColumn('sortie_serigraphie', 'quantite_sortie_serigraphie')) {
                $table->integer('quantite_sortie_serigraphie')->default(0)->after('quantite');
            }
        });

        // temps_operation — API returns: ProdGroup, OpNo, OpCode, TempsOperation
        Schema::table('temps_operation', function (Blueprint $table) {
            if (! Schema::hasColumn('temps_operation', 'prod_group')) {
                $table->string('prod_group', 50)->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('temps_operation', 'op_no')) {
                $table->string('op_no', 50)->nullable()->after('prod_group');
            }
            if (! Schema::hasColumn('temps_operation', 'op_code')) {
                $table->string('op_code', 50)->nullable()->after('op_no');
            }
            if (! Schema::hasColumn('temps_operation', 'temps_operation')) {
                $table->decimal('temps_operation', 10, 2)->nullable()->after('op_code');
            }
        });

        // minutes_presence — API returns: ProdGroup, EmployeeNo, EmployeeName, TempsPresence_Min
        Schema::table('minutes_presence', function (Blueprint $table) {
            if (! Schema::hasColumn('minutes_presence', 'prod_group')) {
                $table->string('prod_group', 50)->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('minutes_presence', 'employee_no')) {
                $table->string('employee_no', 50)->nullable()->after('prod_group');
            }
            if (! Schema::hasColumn('minutes_presence', 'employee_name')) {
                $table->string('employee_name', 100)->nullable()->after('employee_no');
            }
            if (! Schema::hasColumn('minutes_presence', 'temps_presence_min')) {
                $table->decimal('temps_presence_min', 10, 2)->nullable()->after('employee_name');
            }
        });

        // minutes_produites — API returns: ProdGroup, EmployeeNo, EmployeeName, TotalQuantite, MinuteProduite
        Schema::table('minutes_produites', function (Blueprint $table) {
            if (! Schema::hasColumn('minutes_produites', 'atelier')) {
                $table->string('atelier', 50)->nullable()->after('id');
            }
            if (! Schema::hasColumn('minutes_produites', 'prod_group')) {
                $table->string('prod_group', 50)->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('minutes_produites', 'employee_no')) {
                $table->string('employee_no', 50)->nullable()->after('prod_group');
            }
            if (! Schema::hasColumn('minutes_produites', 'employee_name')) {
                $table->string('employee_name', 100)->nullable()->after('employee_no');
            }
            if (! Schema::hasColumn('minutes_produites', 'total_quantite')) {
                $table->integer('total_quantite')->default(0)->after('employee_name');
            }
            if (! Schema::hasColumn('minutes_produites', 'minute_produite')) {
                $table->decimal('minute_produite', 10, 2)->nullable()->after('total_quantite');
            }
        });

        // qte_depart_chaine_article_of — API returns: DateDepartage, Chaine, Article, OF_No, Quantite_Departage
        Schema::table('qte_depart_chaine_article_of', function (Blueprint $table) {
            if (! Schema::hasColumn('qte_depart_chaine_article_of', 'date_departage')) {
                $table->date('date_departage')->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('qte_depart_chaine_article_of', 'of_no')) {
                $table->string('of_no', 50)->nullable()->after('date_departage');
            }
            if (! Schema::hasColumn('qte_depart_chaine_article_of', 'quantite_departage')) {
                $table->integer('quantite_departage')->default(0)->after('quantite');
            }
        });

        // qcm_defect_trx — make item_id nullable (API sends ITEMNO not ITEMID)
        Schema::table('qcm_defect_trx', function (Blueprint $table) {
            $table->string('item_id', 100)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('wip_chaine', function (Blueprint $table) {
            $table->dropColumn(['prod_group', 'wip_chaine']);
        });
        Schema::table('etat_avancement', function (Blueprint $table) {
            $table->dropColumn([
                'of_no', 'prod_group', 'departage', 'vigniette_coupe',
                'envoie_serigraphie', 'sortie_serigraphie', 'sortie_coupe',
                'entree_chaine', 'engagement', 'sortie_montage',
                'controle_qualite', 'conditionement', 'embalage',
            ]);
        });
        Schema::table('efficience_chaine', function (Blueprint $table) {
            $table->dropColumn(['prod_group', 'temps_standard', 'temps_presence', 'efficience_pourcentage']);
        });
        Schema::table('qte_produite', function (Blueprint $table) {
            $table->dropColumn(['date_production', 'of_no', 'article', 'quantite_produite']);
        });
        Schema::table('lost_time', function (Blueprint $table) {
            $table->dropColumn(['lost_type_code', 'lost_type_desc', 'total_lost_time']);
        });
        Schema::table('taging_reel', function (Blueprint $table) {
            $table->dropColumn(['mono', 'prod_group', 'total_engagement', 'total_embalage', 'statut_tagging']);
        });
        Schema::table('packets_rejetes', function (Blueprint $table) {
            $table->dropColumn(['jour', 'rfid_introuvable', 'packet_annule']);
        });
        Schema::table('sortie_coupe', function (Blueprint $table) {
            $table->dropColumn(['date_production', 'op_no', 'quantite_sortie_coupe']);
        });
        Schema::table('qte_engagement', function (Blueprint $table) {
            $table->dropColumn(['date_engagement', 'op_no', 'quantite_engagement']);
        });
        Schema::table('qte_entree_serigraphie', function (Blueprint $table) {
            $table->dropColumn(['date_entree_serigraphie', 'of_no', 'chaine', 'quantite_entree_serigraphie']);
        });
        Schema::table('sortie_serigraphie', function (Blueprint $table) {
            $table->dropColumn(['date_serigraphie', 'op_no', 'quantite_sortie_serigraphie']);
        });
        Schema::table('temps_operation', function (Blueprint $table) {
            $table->dropColumn(['prod_group', 'op_no', 'op_code', 'temps_operation']);
        });
        Schema::table('minutes_presence', function (Blueprint $table) {
            $table->dropColumn(['prod_group', 'employee_no', 'employee_name', 'temps_presence_min']);
        });
        Schema::table('minutes_produites', function (Blueprint $table) {
            $table->dropColumn(['prod_group', 'employee_no', 'employee_name', 'total_quantite', 'minute_produite']);
        });
        Schema::table('qte_depart_chaine_article_of', function (Blueprint $table) {
            $table->dropColumn(['date_departage', 'of_no', 'quantite_departage']);
        });
        Schema::table('qcm_defect_trx', function (Blueprint $table) {
            $table->string('item_id', 100)->nullable(false)->change();
        });
    }
};
