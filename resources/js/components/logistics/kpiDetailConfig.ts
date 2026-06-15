export type KpiKey =
    | 'dot'
    | 'hot'
    | 'respect_plan'
    | 'lead_time'
    | 'stock_mort'
    | 'occupation'
    | 'livraison'
    | 'delai_moyen';

export interface KpiDetailConfig {
    id: string;
    label: string;
    description: string;
    formula: {
        numerator: { label: string; field: string };
        denominator: { label: string; field: string };
        multiplier: number;
        resultUnit: string;
    };
    target: { value: number; operator: '<=' | '>=' };
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
        status: 'live' | 'pending' | 'inactive';
    };
    period: 'jour' | 'annee';
}

export const KPI_DETAIL_CONFIG: Record<KpiKey, KpiDetailConfig> = {
    dot: {
        id: '334',
        label: 'DOT — Delivery On Time',
        description:
            "Pourcentage de commandes livrées à la date promise au client",
        formula: {
            numerator: {
                label: 'Commandes livrées à temps',
                field: 'commandes_a_temps',
            },
            denominator: {
                label: 'Total commandes',
                field: 'total_commandes',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 95, operator: '>=' },
        thresholds: {
            green: '≥ 95%',
            orange: '90% – 95%',
            red: '< 90%',
        },
        source: {
            system: 'GPRO Planning',
            novacityEndpoint: null,
            mysqlTable: null,
            frequency: 'Quotidien',
            status: 'pending',
        },
        period: 'jour',
    },
    hot: {
        id: '335',
        label: 'HOT — Handover On Time',
        description:
            "Pourcentage de transferts effectués à la date prévue (main courante)",
        formula: {
            numerator: {
                label: 'Transferts à temps',
                field: 'transferts_a_temps',
            },
            denominator: {
                label: 'Total transferts',
                field: 'total_transferts',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 95, operator: '>=' },
        thresholds: {
            green: '≥ 95%',
            orange: '90% – 95%',
            red: '< 90%',
        },
        source: {
            system: 'GPRO Planning',
            novacityEndpoint: null,
            mysqlTable: null,
            frequency: 'Quotidien',
            status: 'pending',
        },
        period: 'jour',
    },
    respect_plan: {
        id: '336',
        label: 'Respect Planification',
        description:
            "Ratio entre la quantité produite ce jour et l'objectif quotidien configuré",
        formula: {
            numerator: {
                label: 'Quantité produite ce jour',
                field: 'qte_produite',
            },
            denominator: {
                label: 'Objectif quotidien',
                field: 'objectif_quotidien',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 95, operator: '>=' },
        thresholds: {
            green: '≥ 95%',
            orange: '90% – 95%',
            red: '< 90%',
        },
        source: {
            system: 'SDT / GPRO',
            novacityEndpoint: 'qte_produite',
            mysqlTable: 'qte_produite',
            frequency: 'Temps réel',
            status: 'live',
        },
        period: 'jour',
    },
    lead_time: {
        id: '337',
        label: 'Lead Time Global',
        description:
            'Délai total entre réception matière et expédition (STRH + LT Transport)',
        formula: {
            numerator: {
                label: 'STRH + LT Transport',
                field: 'configurable',
            },
            denominator: {
                label: '(Constante)',
                field: '32',
            },
            multiplier: 1,
            resultUnit: ' j',
        },
        target: { value: 32, operator: '<=' },
        thresholds: {
            green: '≤ 32 jours',
            orange: '32 – 40 jours',
            red: '> 40 jours',
        },
        source: {
            system: 'Configurable',
            novacityEndpoint: null,
            mysqlTable: null,
            frequency: 'Constante',
            status: 'live',
        },
        period: 'jour',
    },
    stock_mort: {
        id: '319',
        label: 'Taux de Stock Mort',
        description:
            "Pourcentage de la quantité totale de stock sans mouvement depuis 365 jours",
        formula: {
            numerator: {
                label: 'Qté sans mouvement 365j',
                field: 'qtte_sans_mvt_365j',
            },
            denominator: {
                label: 'Quantité totale stock',
                field: 'quantite_totale_stock',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 10, operator: '<=' },
        thresholds: {
            green: '≤ 10%',
            orange: '10% – 12%',
            red: '> 12%',
        },
        source: {
            system: 'DIVATEX',
            novacityEndpoint: 'articles_sans_mouvement + quantite_totale_stock',
            mysqlTable:
                'articles_sans_mouvement + quantite_totale_stock',
            frequency: 'Temps réel',
            status: 'live',
        },
        period: 'jour',
    },
    occupation: {
        id: '322',
        label: "Taux d'Occupation Stockage",
        description:
            "Ratio entre le nombre de rouleaux et la capacité de stockage active",
        formula: {
            numerator: {
                label: 'Nombre de rouleaux',
                field: 'nb_rouleaux',
            },
            denominator: {
                label: 'Conteneurs actifs',
                field: 'conteneurs_actifs',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 85, operator: '<=' },
        thresholds: {
            green: '≤ 85%',
            orange: '85% – 95%',
            red: '> 95%',
        },
        source: {
            system: 'DIVATEX',
            novacityEndpoint: 'nombre_rouleaux + capacite_stockage',
            mysqlTable: 'nombre_rouleaux + capacite_stockage',
            frequency: 'Temps réel',
            status: 'live',
        },
        period: 'jour',
    },
    livraison: {
        id: '325',
        label: 'Commandes Livrées à Temps',
        description:
            "Pourcentage d'OFs avec transfert coupe réalisé sur le total d'OFs livrés",
        formula: {
            numerator: {
                label: 'OFs avec transfert coupe total',
                field: 'of_avec_transfert_coupe_total',
            },
            denominator: {
                label: 'OFs livrés total',
                field: 'nb_of_livres_total',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 80, operator: '>=' },
        thresholds: {
            green: '≥ 80%',
            orange: '70% – 80%',
            red: '< 70%',
        },
        source: {
            system: 'DIVATEX',
            novacityEndpoint: 'nombre_ofs_livres',
            mysqlTable: 'nombre_ofs_livres',
            frequency: 'Temps réel',
            status: 'live',
        },
        period: 'jour',
    },
    delai_moyen: {
        id: '328',
        label: 'Délai Moyen de Livraison',
        description:
            "Nombre moyen de jours entre la date de transfert et la date de réservation",
        formula: {
            numerator: {
                label: 'Moyenne jours transfert',
                field: 'moyenne_jours',
            },
            denominator: {
                label: '(Moyenne — pas un ratio)',
                field: 'nb_of_consideres',
            },
            multiplier: 1,
            resultUnit: ' j',
        },
        target: { value: 1, operator: '<=' },
        thresholds: {
            green: '≤ 1 jour',
            orange: '1 – 3 jours',
            red: '> 3 jours',
        },
        source: {
            system: 'DIVATEX',
            novacityEndpoint: 'moyenne_date_transfert',
            mysqlTable: 'moyenne_date_transfert',
            frequency: 'Temps réel',
            status: 'live',
        },
        period: 'jour',
    },
};
