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
    | 'of_confection'
    | 'so_progress'
    | 'couverture_serigraphie'
    | 'couverture_chaine'
    | 'couverture_coupe'
    | 'rft_production'
    | 'br_gtd'
    | 'br_bundling'
    | 'br_print'
    | 'sam'
    | 'sot'
    | 'effectifs'
    | 'objectif'
    | 'code_article'
    | 'designation_article';

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
    view: 'confection' | 'coupe' | 'serigraphie' | 'confection+serigraphie' | 'coupe+serigraphie' | 'all';
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
    efficience_operateur: {
        id: 'F-REQ-201',
        kpiKey: 'efficience_operateur',
        label: 'Efficience par OPÉRATEUR par chaine',
        description:
            '(Minutes produites / minutes présence) × 100',
        formula: {
            numerator: {
                label: 'Minutes produites',
                field: 'minutes_produites',
            },
            denominator: {
                label: 'Minutes présence',
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
            system: 'G.PRO',
            novacityEndpoint:
                'GET /api/data/q/minutes_presence + GET /api/data/q/minutes_produites',
            mysqlTable: 'minutes_presence + minutes_produites',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection',
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
    efficience_chaine: {
        id: 'F-REQ-202',
        kpiKey: 'efficience_chaine',
        label: 'Efficience PAR CHAINE',
        description:
            '[(Quantité déclaré par chaine × SOT) / (Effectif de la chaine × minutes présence)] × 100',
        formula: {
            numerator: {
                label: 'Quantité déclarée',
                field: 'quantite',
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
            orange: '70% – 85%',
            red: '< 70%',
        },
        source: {
            system: 'G.PRO + GPRO consulting',
            novacityEndpoint: 'GET /api/data/q/qte_produite + GET /api/data/q/minutes_presence',
            mysqlTable: 'qte_produite + minutes_presence',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection',
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
        label: 'Efficience Cumulée Chaine (mensuelle)',
        description:
            '(Somme des minutes produites pour le mois en cours / Somme des minutes présence pour le mois en cours) × 100',
        formula: {
            numerator: {
                label: 'Minutes produites (mois)',
                field: 'minutes_produites',
            },
            denominator: {
                label: 'Minutes présence (mois)',
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
            system: 'G.PRO + GPRO consulting',
            novacityEndpoint:
                'GET /api/data/q/minutes_produites + GET /api/data/q/minutes_presence',
            mysqlTable: 'minutes_produites + minutes_presence',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection',
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
        label: 'OWE par chaine',
        description:
            '[(Quantité déclaré par chaine × SAM) / (Effectif de la chaine × minutes présence)] × 100',
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
            green: '≥ 70%',
            orange: '60% – 70%',
            red: '< 60%',
        },
        source: {
            system: 'G.PRO + GPRO consulting',
            novacityEndpoint: 'GET /api/data/rovereffectiveness',
            mysqlTable: 'efficience_chaine + sync_gpro_article_master',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection',
        breakdownType: 'per_chain',
        miniVizType: 'gauge',
        exportFields: ['chaine', 'shift_code', 'mono', 'log_date'],
    },
    wip_chaine: {
        id: 'F-REQ-205',
        kpiKey: 'wip_chaine',
        label: 'WIP par chaine',
        description:
            '(Quantité engagement par chaine) − (Quantité Sortie par chaine poste 93)',
        formula: {
            numerator: {
                label: 'Quantité sortie (poste 93)',
                field: 'sortie_jour',
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
            system: 'G.PRO',
            novacityEndpoint: 'GET /api/data/q/wip_chaine + GET /api/data/q/qte_engagement',
            mysqlTable: 'wip_chaine + qte_engagement',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection+serigraphie',
        breakdownType: 'per_chain',
        miniVizType: 'gauge',
        exportFields: ['chaine', 'en_cours', 'entree_jour', 'sortie_jour'],
        note: 'Formule : SortiePost93 − Engagement. Target is dynamic — cadence value must be fetched from config or GPRO.',
    },
    wip_optimal: {
        id: 'F-REQ-206',
        kpiKey: 'wip_optimal',
        label: 'WIP OPTIMAL',
        description:
            'Quantité engagement (par chaine par article par OF) − Quantité Sortie coupe',
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
            system: 'G.PRO',
            novacityEndpoint:
                'GET /api/data/q/sortie_coupe + GET /api/data/q/qte_engagement + GET /api/data/q/qte_depart_chaine_article_of',
            mysqlTable:
                'sortie_coupe + qte_engagement + qte_depart_chaine_article_of',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection+serigraphie',
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
        label: 'Arrêts non planifiés par chaine',
        description:
            'Lost time',
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
            system: 'G.PRO',
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
    efficience_depart: {
        id: 'F-REQ-208',
        kpiKey: 'efficience_depart',
        label: 'Efficience Départage PAR OPÉRATRICE',
        description:
            '(Minutes produites poste 221 / Minutes présence) × 100',
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
            system: 'G.PRO',
            novacityEndpoint:
                'GET /api/data/q/minutes_produites (filter OpNo=221) + GET /api/data/q/minutes_presence',
            mysqlTable:
                'minutes_produites + minutes_presence (filtered post_id = 221)',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'coupe',
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
        label: 'Efficience Vignettes PAR OPÉRATRICE',
        description: '(Minutes produites poste 213 / Minutes présence) × 100',
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
            system: 'G.PRO',
            novacityEndpoint:
                'GET /api/data/q/minutes_produites (filter OpNo=213) + GET /api/data/q/minutes_presence',
            mysqlTable:
                'minutes_produites + minutes_presence (filtered post_id = 213)',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'coupe',
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
        label: 'Top opérateurs coupe',
        description:
            '[(Quantité produite indiv × temps d\'opération) / minute présence déclaré)] × 100',
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
            system: 'G.PRO',
            novacityEndpoint:
                'GET /api/data/q/qte_produite_indiv_jour + GET /api/data/q/temps_operation + GET /api/data/q/minutes_presence',
            mysqlTable:
                'qte_produite_indiv_jour + temps_operation + minutes_presence',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
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
    sam: {
        kpiKey: 'sam',
        id: 'F-REQ-211',
        label: 'SAM (Temps standard alloué) par chaine',
        description:
            'Temps standard alloué',
        formula: {
            type: 'raw value',
            resultUnit: 'min',
            numerator: { label: 'N/A', field: 'N/A' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 0 },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: {
            system: 'GPRO consulting',
            novacityEndpoint: null,
            mysqlTable: 'sync_gpro_article_master',
            frequency: 'Instantané',
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
        label: 'SOT (Temps article fournisseur) par chaine',
        description:
            'Le temps d\'article de fournisseur',
        formula: {
            type: 'raw value',
            resultUnit: 'min',
            numerator: { label: 'N/A', field: 'N/A' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 0 },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: {
            system: 'GPRO consulting',
            novacityEndpoint: null,
            mysqlTable: 'sync_gpro_article_master',
            frequency: 'Instantané',
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
        label: 'Effectifs par chaine',
        description:
            'Nombre d\'opérateurs exigé',
        formula: {
            type: 'raw value',
            resultUnit: 'pers',
            numerator: { label: 'N/A', field: 'N/A' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 0 },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: {
            system: 'GPRO consulting',
            novacityEndpoint: null,
            mysqlTable: 'sync_gpro_article_master',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: [],
    },
    code_article: {
        kpiKey: 'code_article',
        id: 'F-REQ-214',
        label: 'Code article par chaine',
        description:
            'Code conception de l\'article',
        formula: {
            type: 'raw value',
            resultUnit: '',
            numerator: { label: 'N/A', field: 'N/A' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 0 },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: {
            system: 'GPRO consulting',
            novacityEndpoint: 'GET /api/data/ofabrication',
            mysqlTable: 'ofabrication',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: ['IDOFabrication'],
    },
    designation_article: {
        kpiKey: 'designation_article',
        id: 'F-REQ-215',
        label: 'Designation d\'article par chaine',
        description:
            'Description',
        formula: {
            type: 'raw value',
            resultUnit: '',
            numerator: { label: 'N/A', field: 'N/A' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 0 },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: {
            system: 'GPRO consulting',
            novacityEndpoint: 'GET /api/data/mp',
            mysqlTable: 'sync_gpro_article_master',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: ['Description'],
    },
    couverture_serigraphie: {
        id: 'F-REQ-309',
        kpiKey: 'couverture_serigraphie',
        label: 'Couverture Sérigraphie',
        description:
            'Quantité entrée sérigraphie 236 − quantité produite 239',
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
            system: 'G.PRO',
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
        label: 'Couverture chaine',
        description:
            '(Qté engagé − Qté planifié) / cadence moyenne',
        formula: {
            numerator: { label: 'Quantité engagée', field: 'quantite_engagee' },
            denominator: { label: 'Cadence moyenne', field: 'Non mappé' },
            operator: 'subtraction',
            resultUnit: 'jours de couverture',
        },
        target: { value: 10, operator: '>', label: '> 10 jours de couverture' },
        thresholds: {
            green: '≥ 5 jours de couverture',
            orange: '2 – 5 jours',
            red: '< 2 jours',
        },
        source: {
            system: 'GPRO consulting',
            novacityEndpoint: 'GET /api/data/q/qte_engagement',
            mysqlTable: 'qte_engagement',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection',
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
        label: 'Couverture Coupe',
        description:
            '(Qté lancé − Qté coupé) / cadence hebdomadaire moyenne',
        formula: {
            numerator: {
                label: 'Quantité lancée (coupe)',
                field: 'quantite_engagee',
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
            system: 'DIVA / GPRO consulting',
            novacityEndpoint:
                'GET /api/data/q/sortie_coupe + GET /api/data/ofabrication',
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
    objectif: {
        kpiKey: 'objectif',
        id: 'F-REQ-312',
        label: 'Objectif par chaine',
        description:
            'Objectif prévu journalier',
        formula: {
            type: 'raw value',
            resultUnit: 'pcs',
            numerator: { label: 'N/A', field: 'N/A' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 0 },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: {
            system: 'GPRO consulting',
            novacityEndpoint: null,
            mysqlTable: 'sync_gpro_chain_planning',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: [],
    },
    so_progress: {
        kpiKey: 'so_progress',
        id: 'F-REQ-304',
        label: 'SO Progress par OF',
        description:
            "L'état d'avancement des commandes par point de contrôle",
        formula: {
            type: 'categorical',
            field: 'checkpoint_status per SONo',
            resultUnit: 'Status',
            numerator: {
                label: 'Checkpoint status',
                field: 'avancement_pct',
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
            system: 'G.PRO',
            novacityEndpoint: 'GET /api/data/q/etat_avancement',
            mysqlTable: 'etat_avancement',
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
    of_confection: {
        id: 'F-REQ-301',
        kpiKey: 'of_confection',
        label: 'OF ou OFs confection par CHAINE',
        description: 'Numéros des OF en cours de production par chaine',
        formula: {
            type: 'categorical',
            field: 'of, statut, avancement_pct, quantite_prevue, quantite_realisee',
            resultUnit: 'List',
            numerator: { label: 'Numéro OF', field: 'of' },
            denominator: { label: 'N/A', field: 'N/A' },
        },
        target: { value: 'All OFs en cours', label: 'Tous les OF non soldés' },
        thresholds: {
            green: 'OF en cours, avancement > 80%',
            orange: 'OF en cours, avancement 40% – 80%',
            red: 'OF en cours, avancement < 40%',
        },
        source: {
            system: 'GPRO consulting (SDT)',
            novacityEndpoint: 'GET /api/data/q/etat_avancement',
            mysqlTable: 'etat_avancement',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'all',
        breakdownType: 'per_of',
        miniVizType: 'none',
        exportFields: ['of', 'statut', 'avancement_pct', 'quantite_prevue', 'quantite_realisee'],
        note: 'Filtrer statut = "en_cours". Afficher la liste de tous les OF non soldés.',
    },
    taux_avancement_of: {
        id: 'F-REQ-305',
        kpiKey: 'taux_avancement_of',
        label: "Taux d'avancement OF par OF par chaine",
        description:
            "(Quantité produite déclaré / Quantité OF) × 100",
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
            system: 'GPRO consulting',
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
    rft_production: {
        kpiKey: 'rft_production',
        id: 'F-REQ-104',
        label: 'RFT (Right First Time — jour en cours)',
        description:
            'Pourcentage de pièces conformes dès le premier contrôle par rapport au total produit ce jour',
        formula: {
            numerator: {
                label: 'Pièces OK 1er coup',
                field: 'FirstPassToday',
            },
            denominator: {
                label: 'Total pièces produites',
                field: 'ProducedToday',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 98, operator: '≥' },
        thresholds: {
            green: '≥ 98%',
            orange: '95% – 98%',
            red: '< 95%',
        },
        source: {
            system: 'gpro-prod',
            novacityEndpoint:
                'GET /api/data/q/pieces_ok_de_premier_coup_jour_en_cours + GET /api/data/q/pieces_produites_jour_en_cours',
            mysqlTable: 'pieces_ok_jour + pieces_produites_jour',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection+serigraphie',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: ['date', 'first_pass_today', 'produced_today', 'rft_pct'],
    },
    br_gtd: {
        kpiKey: 'br_gtd',
        id: 'F-REQ-102',
        label: "BR GTD (jour en cours)",
        description:
            "Nombre de rejet suite contrôle par chaîne de production / Nombre de contrôle par chaîne de production × 100 (ce jour : jour en cours).",
        formula: {
            type: 'raw value',
            field: 'br_gtd',
            resultUnit: '%',
            numerator: { label: 'Nombre de rejets contrôle', field: 'qtte' },
            denominator: { label: 'Nombre de contrôles', field: 'total_colis' },
        },
        target: { value: 5, operator: '≤' },
        thresholds: { green: '≤ 4%', orange: '4% – 5%', red: '> 5%' },
        source: {
            system: 'DIVA',
            novacityEndpoint: 'GET /api/data/q/packets_rejetes + GET /api/data/q/colis_total_3var',
            mysqlTable: 'packets_rejetes + colis_total_var',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'confection',
        breakdownType: 'none',
        miniVizType: 'gauge',
        exportFields: ['date', 'br_gtd'],
    },
    br_bundling: {
        kpiKey: 'br_bundling',
        id: 'F-REQ-106',
        label: 'BR Bundling (jour en cours)',
        description:
            "Nombre de rejet suite inspection Paquet / Nombre d'inspection Paquet × 100 (ce jour : jour en cours).",
        formula: {
            type: 'raw value',
            field: 'br_bundling',
            resultUnit: '%',
            numerator: { label: 'Nombre de rejet suite inspection Paquet', field: 'BundleRejectToday' },
            denominator: { label: "Nombre d'inspection Paquet", field: 'BundleInspectedToday' },
        },
        target: { value: 5, operator: '≤' },
        thresholds: { green: '≤ 4%', orange: '4% – 5%', red: '> 5%' },
        source: {
            system: 'gpro-prod',
            novacityEndpoint: 'GET /api/data/q/rejets_suite_inspection_paquet_jour_en_cours',
            mysqlTable: 'rejets_inspection_paquet',
            frequency: 'Instantané',
            status: 'live',
        },
        view: 'coupe',
        breakdownType: 'none',
        miniVizType: 'gauge',
        exportFields: ['date', 'br_bundling'],
    },
    br_print: {
        kpiKey: 'br_print',
        id: 'F-REQ-108',
        label: "BR Print (jour en cours)",
        description:
            "Nombre de rejet suite inspection livraison sérigraphie / Nombre d'inspection livraison sérigraphie × 100 (ce jour : le jour en cours).",
        formula: {
            type: 'raw value',
            field: 'br_print',
            resultUnit: '%',
            numerator: { label: 'Nombre de rejet suite inspection livraison sérigraphie', field: '—' },
            denominator: { label: "Nombre d'inspection livraison sérigraphie", field: '—' },
        },
        target: { value: 5, operator: '≤' },
        thresholds: {
            green: '≤ 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DRIVE',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_br_print',
            frequency: '4×/jour',
            status: 'live',
        },
        view: 'coupe+serigraphie',
        breakdownType: 'none',
        miniVizType: 'none',
        exportFields: ['date', 'br_print'],
    },
};
