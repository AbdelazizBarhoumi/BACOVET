export type ProductionKpiKey =
    | 'efficience_chaine'
    | 'efficience_cumulee'
    | 'owe_chaine'
    | 'wip_chaine'
    | 'wip_optimal'
    | 'arrets_non_planifies'
    | 'efficience_operateur'
    | 'efficience_depart'
    | 'efficience_vignettes'
    | 'top_operateurs'
    | 'taux_avancement_of'
    | 'so_progress'
    | 'couverture_serigraphie'
    | 'couverture_chaine'
    | 'couverture_coupe'
    | 'taux_fiabilite_systeme'
    | 'rft_production'
    | 'br_gtd'
    | 'br_bundling'
    | 'br_print'
    | 'taux_archivage'
    | 'respect_temps_estime'
    | 'temps_acceptes'
    | 'sam'
    | 'sot'
    | 'effectifs'
    | 'objectif';

export interface ProductionKpiDetailConfig {
    id: string;
    kpiKey: string;
    label: string;
    description: string;
    formula: {
        numerator: { label: string; field: string };
        denominator: { label: string; field: string };
        multiplier?: number;
        operator?: 'subtraction' | 'ratio' | 'comparison';
        resultUnit: string;
        type?: 'raw value' | 'categorical' | 'comparison' | 'computed';
        field?: string;
        field_a?: string;
        field_b?: string;
    };
    target: {
        value: number | string;
        operator?: '<=' | '>=' | '>' | '<' | '≤' | '≥';
        label?: string;
    };
    thresholds: {
        green: string;
        orange: string;
        red: string;
        grey?: string;
    };
    source: {
        system: string;
        novacityEndpoint: string | null;
        mysqlTable: string | null;
        frequency: string;
        status: 'live' | 'pending' | 'inactive' | 'google_drive' | 'blocked';
    };
    view: 'confection' | 'coupe' | 'serigraphie' | 'all';
    breakdownType:
        | 'per_chain'
        | 'per_operator'
        | 'per_of'
        | 'timeline'
        | 'none';
    miniVizType:
        | 'gauge'
        | 'sparkline'
        | 'horizontal_bar'
        | 'timeline'
        | 'donut'
        | 'none';
    exportFields: string[];
    note?: string;
}

export const PRODUCTION_KPI_DETAIL_CONFIG: Record<
    ProductionKpiKey,
    ProductionKpiDetailConfig
> = {
    efficience_chaine: {
        id: 'F-REQ-202',
        kpiKey: 'efficience_chaine',
        label: 'Efficience par Chaîne',
        description:
            'Taux d\'efficience de la chaîne de production basé sur les heures standards et les heures produites.',
        formula: {
            numerator: {
                label: 'Heures standards',
                field: 'heures_standards',
            },
            denominator: {
                label: 'Heures produites',
                field: 'heures_prod',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 85, operator: '>' },
        thresholds: {
            green: '≥ 90%',
            orange: '85% – 90%',
            red: '< 85%',
        },
        source: {
            system: 'SDT',
            novacityEndpoint: 'GET /api/data/q/efficience_chaine',
            mysqlTable: 'efficience_chaine',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_chain',
        miniVizType: 'gauge',
        exportFields: [
            'chaine',
            'date',
            'heures_prod',
            'heures_standards',
            'efficience_pct',
        ],
    },
    efficience_cumulee: {
        id: 'F-REQ-203',
        kpiKey: 'efficience_cumulee',
        label: 'Efficience Cumulée — Mois en cours',
        description:
            'Ratio cumulé des minutes produites sur les minutes de présence depuis le début du mois en cours',
        formula: {
            numerator: {
                label: 'Σ minutes produites (mois)',
                field: 'total_minutes_produites',
            },
            denominator: {
                label: 'Σ minutes présence (mois)',
                field: 'total_minutes_presence',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 85, operator: '>' },
        thresholds: {
            green: '≥ 85%',
            orange: '80% – 85%',
            red: '< 80%',
        },
        source: {
            system: 'SDT (G.PRO + GPRO consulting)',
            novacityEndpoint:
                'GET /api/data/q/minutes_presence + GET /api/data/q/minutes_produites',
            mysqlTable: 'minutes_presence + minutes_produites',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_chain',
        miniVizType: 'sparkline',
        exportFields: [
            'chaine',
            'date',
            'minutes_presence',
            'minutes_produites',
            'efficience_pct',
        ],
    },
    owe_chaine: {
        id: 'F-REQ-204',
        kpiKey: 'owe_chaine',
        label: 'OWE — Overall Workforce Effectiveness par Chaîne',
        description:
            "Taux d'efficience globale basé sur SAM et temps de production par chaîne.",
        formula: {
            numerator: {
                label: 'Quantité déclarée × SAM',
                field: 'qty_declared_x_sam',
            },
            denominator: {
                label: 'Effectif × Minutes présence',
                field: 'headcount_x_minutes',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 70, operator: '>' },
        thresholds: {
            green: '≥ 75%',
            orange: '70% – 75%',
            red: '< 70%',
        },
        source: {
            system: 'GPRO + Novacity',
            novacityEndpoint: 'GET /api/data/rovereffectiveness',
            mysqlTable: 'efficience_chaine + sync_gpro_article_master',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_chain',
        miniVizType: 'gauge',
        exportFields: ['chaine', 'shift_code', 'mono', 'log_date'],
    },
    wip_chaine: {
        id: 'F-REQ-205',
        kpiKey: 'wip_chaine',
        label: 'WIP — Work In Progress par Chaîne',
        description:
            'WIP par chaîne — Quantité sortie moins quantité engagée. Cible : ≤ ½ cadence.',
        formula: {
            numerator: {
                label: 'Quantité sortie (poste 93)',
                field: 'sortie_post93',
            },
            denominator: {
                label: 'Quantité engagée (chaine)',
                field: 'quantite_engagee',
            },
            operator: 'subtraction',
            resultUnit: 'Qté',
        },
        target: { value: '½ cadence', operator: '≤' },
        thresholds: {
            green: '≤ ½ cadence journalière',
            orange: '½ – 1× cadence',
            red: '> 1× cadence',
        },
        source: {
            system: 'SDT',
            novacityEndpoint: 'GET /api/data/q/wip_chaine + GET /api/data/q/qte_engagement',
            mysqlTable: 'wip_chaine + qte_engagement',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_chain',
        miniVizType: 'gauge',
        exportFields: ['chaine', 'en_cours', 'entree_jour', 'sortie_jour'],
        note: 'Formule : SortiePost93 − Engagement. Target is dynamic — cadence value must be fetched from config or GPRO.',
    },
    wip_optimal: {
        id: 'F-REQ-206',
        kpiKey: 'wip_optimal',
        label: 'WIP Optimal — Coupe vers Confection (par OF / Article)',
        description:
            'Écart entre la quantité sortie coupe et la quantité engagée par chaîne, article et OF — doit couvrir au moins 1,5× la cadence',
        formula: {
            numerator: {
                label: 'Quantité sortie coupe',
                field: 'quantite_coupee',
            },
            denominator: {
                label: 'Quantité engagée',
                field: 'quantite_engagee',
            },
            operator: 'subtraction',
            resultUnit: 'Qté vs seuil 1,5× cadence',
        },
        target: { value: '1,5 × cadence chaîne', operator: '≥' },
        thresholds: {
            green: '≥ 1,5× cadence',
            orange: '1× – 1,5× cadence',
            red: '< 1× cadence',
        },
        source: {
            system: 'SDT',
            novacityEndpoint:
                'GET /api/data/q/sortie_coupe + GET /api/data/q/qte_engagement + GET /api/data/q/qte_depart_chaine_article_of',
            mysqlTable:
                'sortie_coupe + qte_engagement + qte_depart_chaine_article_of',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'coupe',
        breakdownType: 'per_of',
        miniVizType: 'sparkline',
        exportFields: [
            'of',
            'chaine',
            'article',
            'quantite_coupee',
            'quantite_engagee',
            'ecart',
        ],
    },
    arrets_non_planifies: {
        id: 'F-REQ-207',
        kpiKey: 'arrets_non_planifies',
        label: 'Arrêts Non Planifiés par Chaîne',
        description:
            'Durée et motif de chaque arrêt non planifié enregistré ce jour par chaîne de production',
        formula: {
            type: 'raw value',
            field: 'minutes_perdues per motif',
            resultUnit: 'Minutes',
            numerator: { label: 'Minutes perdues', field: 'minutes_perdues' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 10, operator: '<', label: '< 10 minutes par arrêt' },
        thresholds: {
            green: '0 arrêts',
            orange: '1 arrêt ou durée ≤ 10 min',
            red: '> 1 arrêt ou durée > 10 min',
        },
        source: {
            system: 'SDT',
            novacityEndpoint: 'GET /api/data/q/lost_time',
            mysqlTable: 'lost_time',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'timeline',
        miniVizType: 'timeline',
        exportFields: ['date', 'chaine', 'motif', 'minutes_perdues'],
        note: 'Breakdown table shows ALL motifs as a sortable list. Timeline shows events today on a horizontal time axis. Include LostType lookup from GET /api/data/losttype for human-readable motif descriptions.',
    },
    efficience_operateur: {
        id: 'F-REQ-201',
        kpiKey: 'efficience_operateur',
        label: 'Efficience par Opérateur par Chaîne',
        description:
            'Ratio des minutes produites sur les minutes de présence individuel — classement opérateurs par chaîne',
        formula: {
            numerator: {
                label: 'Minutes produites (individu)',
                field: 'minutes_produites',
            },
            denominator: {
                label: 'Minutes présence (individu)',
                field: 'minutes_presence',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 90, operator: '≥' },
        thresholds: {
            green: '≥ 90%',
            orange: '80% – 90%',
            red: '< 80%',
        },
        source: {
            system: 'SDT',
            novacityEndpoint:
                'GET /api/data/q/minutes_presence + GET /api/data/q/minutes_produites',
            mysqlTable: 'minutes_presence + minutes_produites',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_operator',
        miniVizType: 'horizontal_bar',
        exportFields: [
            'employe',
            'chaine',
            'date',
            'minutes_presence',
            'minutes_produites',
            'efficience_pct',
        ],
    },
    efficience_depart: {
        id: 'F-REQ-208',
        kpiKey: 'efficience_depart',
        label: 'Efficience Départage par Opératrice (Poste 221)',
        description:
            'Efficience individuelle au poste de départage (poste 221) — ratio minutes produites poste 221 sur présence',
        formula: {
            numerator: {
                label: 'Minutes produites poste 221',
                field: 'minutes_produites_221',
            },
            denominator: {
                label: 'Minutes présence',
                field: 'minutes_presence',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 85, operator: '>' },
        thresholds: {
            green: '≥ 85%',
            orange: '80% – 85%',
            red: '< 80%',
        },
        source: {
            system: 'SDT (G.PRO)',
            novacityEndpoint:
                'GET /api/data/q/minutes_produites (filter OpNo=221) + GET /api/data/q/minutes_presence',
            mysqlTable:
                'minutes_produites + minutes_presence (filtered post_id = 221)',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_operator',
        miniVizType: 'horizontal_bar',
        exportFields: [
            'employe',
            'chaine',
            'date',
            'minutes_presence',
            'minutes_produites_221',
            'efficience_pct',
        ],
    },
    efficience_vignettes: {
        id: 'F-REQ-209',
        kpiKey: 'efficience_vignettes',
        label: 'Efficience Vignettes par Opératrice (Poste 213)',
        description: 'Efficience individuelle au poste vignettes (poste 213)',
        formula: {
            numerator: {
                label: 'Minutes produites poste 213',
                field: 'minutes_produites_213',
            },
            denominator: {
                label: 'Minutes présence',
                field: 'minutes_presence',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 85, operator: '>' },
        thresholds: {
            green: '≥ 85%',
            orange: '80% – 85%',
            red: '< 80%',
        },
        source: {
            system: 'SDT (G.PRO)',
            novacityEndpoint:
                'GET /api/data/q/minutes_produites (filter OpNo=213) + GET /api/data/q/minutes_presence',
            mysqlTable:
                'minutes_produites + minutes_presence (filtered post_id = 213)',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_operator',
        miniVizType: 'horizontal_bar',
        exportFields: [
            'employe',
            'chaine',
            'date',
            'minutes_presence',
            'minutes_produites_213',
            'efficience_pct',
        ],
    },
    top_operateurs: {
        id: 'F-REQ-210',
        kpiKey: 'top_operateurs',
        label: 'Top Opérateurs — Coupe',
        description:
            "Efficience des opérateurs à un poste spécifique (départage ou vignettes).",
        formula: {
            numerator: {
                label: 'Quantité produite indiv × Temps opération',
                field: 'qte_x_temps_op',
            },
            denominator: {
                label: 'Minutes présence déclarées',
                field: 'minutes_presence',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 90, operator: '≥' },
        thresholds: {
            green: '≥ 90%',
            orange: '80% – 90%',
            red: '< 80%',
        },
        source: {
            system: 'SDT',
            novacityEndpoint:
                'GET /api/data/q/qte_produite_indiv_jour + GET /api/data/q/temps_operation + GET /api/data/q/minutes_presence',
            mysqlTable:
                'qte_produite_indiv_jour + temps_operation + minutes_presence',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'coupe',
        breakdownType: 'per_operator',
        miniVizType: 'horizontal_bar',
        exportFields: [
            'employe',
            'chaine',
            'quantite',
            'minutes_produites',
            'minutes_presence',
            'efficience_pct',
        ],
        note: 'Breakdown shows ranked list — top 10 operators, best to worst. Gold/silver/bronze badges for top 3.',
    },
    taux_avancement_of: {
        id: 'F-REQ-305',
        kpiKey: 'taux_avancement_of',
        label: "Taux d'Avancement OF par Chaîne",
        description:
            "Pourcentage d'avancement de l'ordre de fabrication en cours — quantité déclarée vs quantité OF totale",
        formula: {
            numerator: {
                label: 'Quantité produite déclarée',
                field: 'quantite_realisee',
            },
            denominator: {
                label: 'Quantité OF totale',
                field: 'quantite_prevue',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: {
            value: 'On schedule',
            label: 'On schedule (EPD not exceeded)',
        },
        thresholds: {
            green: '≥ 80% et EPD non dépassée',
            orange: '50% – 80% ou EPD proche',
            red: '< 50% ou EPD dépassée',
        },
        source: {
            system: 'SDT',
            novacityEndpoint: 'GET /api/data/q/etat_avancement',
            mysqlTable: 'etat_avancement',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_of',
        miniVizType: 'donut',
        exportFields: [
            'of',
            'avancement_pct',
            'quantite_prevue',
            'quantite_realisee',
            'statut',
        ],
        note: 'Breakdown lists all active OFs. Donut shows single OF completion if one selected, or aggregate if multiple.',
    },
    so_progress: {
        id: 'F-REQ-304',
        kpiKey: 'so_progress',
        label: 'SO Progress — Avancement par Point de Contrôle',
        description:
            "État d'avancement de la commande à chaque point de contrôle de la chaîne de production",
        formula: {
            type: 'categorical',
            field: 'checkpoint_status per SONo',
            resultUnit: 'Status',
            numerator: {
                label: 'Checkpoint status',
                field: 'checkpoint_status',
            },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 'All green', label: 'All checkpoints green' },
        thresholds: {
            green: 'Tous les checkpoints validés',
            orange: 'Un ou plusieurs checkpoints en attente',
            red: 'Checkpoint bloqué',
        },
        source: {
            system: 'SDT',
            novacityEndpoint: 'GET /api/data/itemtrxenq',
            mysqlTable: 'item_trx_enq',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_of',
        miniVizType: 'none',
        exportFields: [
            'so_no',
            'item_no',
            'op_no',
            'transaction_id',
            'is_split',
        ],
        note: 'Breakdown renders as a horizontal progress stepper — each OpNo is a step, colored by validation status.',
    },
    couverture_serigraphie: {
        id: 'F-REQ-309',
        kpiKey: 'couverture_serigraphie',
        label: 'Couverture Sérigraphie — Stock Disponible',
        description:
            'Quantité disponible en entrée sérigraphie moins la quantité déjà produite — représente le stock tampon',
        formula: {
            numerator: {
                label: 'Quantité entrée sérigraphie (poste 236)',
                field: 'qte_entree',
            },
            denominator: {
                label: 'Quantité produite (poste 239)',
                field: 'qte_produite_seri',
            },
            operator: 'subtraction',
            resultUnit: 'Qté vs cadence hebdomadaire',
        },
        target: {
            value: 'cadence hebdo',
            operator: '>',
            label: '> cadence hebdomadaire moyenne',
        },
        thresholds: {
            green: '> cadence hebdo',
            orange: '0 – cadence hebdo',
            red: 'Rupture (valeur négative)',
        },
        source: {
            system: 'SDT',
            novacityEndpoint:
                'GET /api/data/q/qte_entree_serigraphie + GET /api/data/q/sortie_serigraphie',
            mysqlTable: 'qte_entree_serigraphie + sortie_serigraphie',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'serigraphie',
        breakdownType: 'per_chain',
        miniVizType: 'sparkline',
        exportFields: [
            'date',
            'article',
            'couleur',
            'qte_entree',
            'qte_sortie',
            'couverture',
        ],
    },
    couverture_chaine: {
        kpiKey: 'couverture_chaine',
        id: 'F-REQ-310',
        label: 'Couverture Chaîne',
        description:
            'Quantités lancées en chaîne moins les quantités déjà produites, rapportées à la cadence moyenne',
        formula: {
            numerator: { label: 'Quantité lancée', field: 'qte_lancee' },
            denominator: { label: 'Quantité produite', field: 'qte_produite' },
            operator: 'subtraction',
            resultUnit: 'jours de couverture',
        },
        target: { value: 5, operator: '>=', label: '≥ 5 jours de couverture' },
        thresholds: {
            green: '≥ 5 jours de couverture',
            orange: '2 – 5 jours',
            red: '< 2 jours',
        },
        source: {
            system: 'SDT',
            novacityEndpoint: 'GET /api/data/q/couverture_chaine',
            mysqlTable: 'couverture_chaine',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_chain',
        miniVizType: 'sparkline',
        exportFields: [
            'chaine',
            'date',
            'quantite_lancee',
            'quantite_produite',
            'couverture_jours',
        ],
    },
    couverture_coupe: {
        kpiKey: 'couverture_coupe',
        id: 'F-REQ-311',
        label: 'Couverture Coupe — Stock Disponible Confection',
        description:
            'Quantités lancées en coupe moins les quantités déjà coupées, rapportées à la cadence hebdomadaire',
        formula: {
            numerator: {
                label: 'Quantité lancée (coupe)',
                field: 'qte_lancee',
            },
            denominator: { label: 'Quantité coupée', field: 'quantite_coupee' },
            operator: 'subtraction',
            resultUnit: 'jours de couverture',
        },
        target: {
            value: 'cadence hebdo',
            operator: '>',
            label: '> cadence hebdomadaire moyenne',
        },
        thresholds: {
            green: '≥ 5 jours de couverture',
            orange: '2 – 5 jours',
            red: '< 2 jours (risque rupture)',
        },
        source: {
            system: 'SDT + DIVATEX (GPRO consulting)',
            novacityEndpoint:
                'GET /api/data/q/sortie_coupe + GET /api/data/ofabrication (DIVATEX)',
            mysqlTable: 'sortie_coupe + ofabrication',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'coupe',
        breakdownType: 'per_of',
        miniVizType: 'sparkline',
        exportFields: [
            'commande',
            'date',
            'quantite_coupee',
            'couverture_jours',
        ],
    },
    taux_fiabilite_systeme: {
        kpiKey: 'taux_fiabilite_systeme',
        id: 'F-REQ-217',
        label: 'Taux de Fiabilité des Données Système par OF',
        description:
            'Écart entre le tagging réel constaté et la sortie fin de chaîne enregistrée dans le système',
        formula: {
            type: 'comparison',
            field_a: 'tag_reel',
            field_b: 'tag_theorique',
            resultUnit: '%',
            numerator: { label: 'Tag réel', field: 'tag_reel' },
            denominator: { label: 'Tag théorique', field: 'tag_theorique' },
        },
        target: {
            value: 95,
            operator: '≥',
            label: '≥ 95% fiabilité (ecart_pct within ±5%)',
        },
        thresholds: {
            green: '|ecart_pct| ≤ 2%',
            orange: '|ecart_pct| 2% – 5%',
            red: '|ecart_pct| > 5%',
        },
        source: {
            system: 'SDT',
            novacityEndpoint: 'GET /api/data/q/taging_reel',
            mysqlTable: 'taging_reel',
            frequency: 'Journalière',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_chain',
        miniVizType: 'sparkline',
        exportFields: [
            'chaine',
            'shift',
            'tag_theorique',
            'tag_reel',
            'ecart_pct',
        ],
    },
    rft_production: {
        kpiKey: 'rft_production',
        id: 'F-REQ-104',
        label: 'RFT — Right First Time Production (Ce jour)',
        description:
            'Pourcentage de pièces conformes dès le premier contrôle par rapport au total produit ce jour',
        formula: {
            numerator: {
                label: 'Pièces OK 1er coup',
                field: 'first_pass_today',
            },
            denominator: {
                label: 'Total pièces produites',
                field: 'produced_today',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 98, operator: '≥' },
        thresholds: {
            green: '≥ 98%',
            orange: '95% – 97%',
            red: '< 95%',
        },
        source: {
            system: 'QCM',
            novacityEndpoint:
                'GET /api/data/q/pieces_ok_de_premier_coup_jour_en_cours + GET /api/data/q/pieces_produites_jour_en_cours',
            mysqlTable: 'pieces_ok_jour + pieces_produites_jour',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: ['date', 'first_pass_today', 'produced_today', 'rft_pct'],
    },
    br_gtd: {
        kpiKey: 'br_gtd',
        id: 'F-REQ-102',
        label: "BR GTD (Aujourd'hui)",
        description:
            "Nombre de rejet suite contrôle par chaîne de production / Nombre de contrôle par chaîne de production × 100 (ce jour : jour en cours).",
        formula: {
            type: 'raw value',
            field: 'br_gtd',
            resultUnit: '%',
            numerator: { label: 'Nombre de rejets contrôle', field: 'nb_rejets' },
            denominator: { label: 'Nombre de contrôles', field: 'nb_controles' },
        },
        target: { value: 5, operator: '≤' },
        thresholds: { green: '≤ 5%', orange: '5% – 10%', red: '> 10%' },
        source: {
            system: 'DIVA / GPRO',
            novacityEndpoint: null,
            mysqlTable: 'check_pass_qte',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'none',
        miniVizType: 'gauge',
        exportFields: ['date', 'br_gtd'],
    },
    br_bundling: {
        kpiKey: 'br_bundling',
        id: 'F-REQ-106',
        label: 'BR Bundling',
        description:
            "Nombre de rejet suite inspection Paquet / Nombre d'inspection Paquet × 100 (ce jour : jour en cours).",
        formula: {
            type: 'raw value',
            field: 'br_bundling',
            resultUnit: '%',
            numerator: { label: 'BR Bundling', field: 'br_bundling' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 5, operator: '≤' },
        thresholds: { green: '≤ 5%', orange: '5% – 10%', red: '> 10%' },
        source: {
            system: 'GPRO Prod',
            novacityEndpoint: null,
            mysqlTable: 'rejets_inspection_paquet',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'none',
        miniVizType: 'gauge',
        exportFields: ['date', 'br_bundling'],
    },
    br_print: {
        kpiKey: 'br_print',
        id: 'F-REQ-108',
        label: "BR Print (Aujourd'hui)",
        description:
            "Nombre de rejet suite inspection livraison sérigraphie / Nombre d'inspection livraison sérigraphie × 100 (ce jour : jour en cours).",
        formula: {
            type: 'raw value',
            field: 'br_print',
            resultUnit: '%',
            numerator: { label: 'BR Print', field: 'br_print' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 5, operator: '≤' },
        thresholds: {
            green: '≤ 5%',
            orange: '5% – 10%',
            red: '> 10%',
        },
        source: {
            system: 'Google Drive',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_br_print',
            frequency: '4×/jour',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: ['date', 'br_print'],
    },
    taux_archivage: {
        kpiKey: 'taux_archivage',
        id: 'F-REQ-216',
        label: "Taux d'Archivage Suivi Paquets",
        description:
            "Pourcentage de paquets soldés qui ont été archivés. Source: GPRO Suivi Paquets.",
        formula: {
            type: 'computed',
            resultUnit: '%',
            numerator: { label: 'Paquets archivés (est_solde=1)', field: 'est_archive' },
            denominator: { label: 'Paquets soldés (est_solde=1)', field: 'est_solde' },
            multiplier: 100,
        },
        target: { value: 85, operator: '≥' },
        thresholds: {
            green: '≥ 85%',
            orange: '70% – 85%',
            red: '< 70%',
        },
        source: {
            system: 'GPRO',
            novacityEndpoint: null,
            mysqlTable: 'sync_gpro_suivi_paquets',
            frequency: 'Quotidien',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_chain',
        miniVizType: 'gauge',
        exportFields: ['of_numero', 'est_solde', 'est_archive'],
    },
    respect_temps_estime: {
        kpiKey: 'respect_temps_estime',
        id: 'F-REQ-218',
        label: 'Taux de Respect du Temps Estimé',
        description:
            "Pourcentage d'articles dont le temps de production est inférieur ou égal au temps coté. Source: Google Drive Cotation.",
        formula: {
            type: 'computed',
            resultUnit: '%',
            numerator: { label: 'Articles respectant le temps estimé', field: 'respect_count' },
            denominator: { label: 'Total articles', field: 'total_count' },
            multiplier: 100,
        },
        target: { value: 90, operator: '≥' },
        thresholds: {
            green: '≥ 90%',
            orange: '80% – 90%',
            red: '< 80%',
        },
        source: {
            system: 'DRIVE',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_cotation',
            frequency: '4×/jour',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_chain',
        miniVizType: 'gauge',
        exportFields: ['article', 'temps_cotation_min', 'temps_production_min'],
    },
    temps_acceptes: {
        kpiKey: 'temps_acceptes',
        id: 'F-REQ-219',
        label: 'Taux des Temps Acceptés dès la 1ère Version',
        description:
            "Pourcentage de gammes acceptées dès la première version. Source: Google Drive Gammes.",
        formula: {
            type: 'computed',
            resultUnit: '%',
            numerator: { label: 'Gammes acceptées V1', field: 'nb_gammes_acceptees_v1' },
            denominator: { label: 'Total gammes', field: 'nb_gammes_total' },
            multiplier: 100,
        },
        target: { value: 80, operator: '≥' },
        thresholds: {
            green: '≥ 80%',
            orange: '60% – 80%',
            red: '< 60%',
        },
        source: {
            system: 'DRIVE',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_gammes',
            frequency: '4×/jour',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_chain',
        miniVizType: 'gauge',
        exportFields: ['article', 'nb_gammes_total', 'nb_gammes_acceptees_v1'],
    },
    sam: {
        kpiKey: 'sam',
        id: 'F-REQ-211',
        label: 'SAM — Temps Standard Alloué par Article',
        description:
            "Temps standard alloué à la fabrication d'une pièce pour l'article en cours, exprimé en minutes",
        formula: {
            type: 'raw value',
            resultUnit: 'min',
            numerator: { label: 'N/A', field: 'N/A' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 0 },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: {
            system: 'GPRO Consulting',
            novacityEndpoint: null,
            mysqlTable: 'sync_gpro_article_master',
            frequency: 'Tous les 15 min',
            status: 'live',
        },
        view: 'confection',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: [],
    },
    sot: {
        kpiKey: 'sot',
        id: 'F-REQ-212',
        label: 'SOT — Temps Article Fournisseur par Chaîne',
        description:
            "Temps de fabrication réel constaté chez le fournisseur — sert de référence pour le calcul d'efficience",
        formula: {
            type: 'raw value',
            resultUnit: 'min',
            numerator: { label: 'N/A', field: 'N/A' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 0 },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: {
            system: 'GPRO Consulting',
            novacityEndpoint: null,
            mysqlTable: 'sync_gpro_article_master',
            frequency: 'Tous les 15 min',
            status: 'live',
        },
        view: 'confection',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: [],
    },
    effectifs: {
        kpiKey: 'effectifs',
        id: 'F-REQ-213',
        label: 'Effectifs par Chaîne',
        description:
            "Nombre d'opérateurs exigés affectés à la chaîne pour l'OF en cours",
        formula: {
            type: 'raw value',
            resultUnit: 'pers',
            numerator: { label: 'N/A', field: 'N/A' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 0 },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: {
            system: 'GPRO Consulting',
            novacityEndpoint: null,
            mysqlTable: 'sync_gpro_article_master',
            frequency: 'Tous les 15 min',
            status: 'live',
        },
        view: 'confection',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: [],
    },
    objectif: {
        kpiKey: 'objectif',
        id: 'F-REQ-312',
        label: 'Objectif Journalier par Chaîne',
        description:
            'Quantité cible à produire ce jour sur la chaîne, selon la planification GPRO',
        formula: {
            type: 'raw value',
            resultUnit: 'pcs',
            numerator: { label: 'N/A', field: 'N/A' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 0 },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: {
            system: 'GPRO Consulting',
            novacityEndpoint: null,
            mysqlTable: 'sync_gpro_chain_planning',
            frequency: 'Toutes les 5 min',
            status: 'live',
        },
        view: 'confection',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: [],
    },
};
