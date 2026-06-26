export type KpiKey =
    | 'dot'
    | 'hot'
    | 'respect_plan'
    | 'lead_time'
    | 'stock_mort_acc'
    | 'stock_mort_tissu'
    | 'stock_mort_fg'
    | 'occupation_acc'
    | 'occupation_tissu'
    | 'occupation_fg'
    | 'livraison_acc'
    | 'livraison_tissu'
    | 'livraison_fg'
    | 'delai_acc'
    | 'delai_tissu'
    | 'delai_fg'
    | 'stock_typologie'
    | 'stock_provenance'
    | 'stock_brand'
    | 'stock_reliability_acc'
    | 'stock_reliability_tissu'
    | 'stock_reliability_fg'
    | 'rotation_acc'
    | 'rotation_tissu'
    | 'rotation_fg';

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
    target: { value: number; operator: '<=' | '>=' | '>' | '<' };
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
    period: string;
}

export const KPI_DETAIL_CONFIG: Record<KpiKey, KpiDetailConfig> = {
    dot: {
        id: '334',
        label: 'DOT (Delivery)',
        description:
            "(QT livrée on time / ordered QT) × 100",
        formula: {
            numerator: {
                label: 'Quantité livrée à temps',
                field: 'NbOF_Livres_Total',
            },
            denominator: {
                label: 'Quantité commandée',
                field: 'quantite_engagee',
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
            system: 'gpro-planning / carnet',
            novacityEndpoint: 'GET /api/data/q/nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel + GET /api/data/q/qte_engagement',
            mysqlTable: 'nombre_ofs_livres + qte_engagement',
            frequency: 'Temps réel',
            status: 'live',
        },
        period: 'jour',
    },
    hot: {
        id: '335',
        label: 'HOT (Handover)',
        description:
            "(QT livrée on time / ordered QT) × 100",
        formula: {
            numerator: {
                label: 'Quantité livrée à temps',
                field: 'Non mappé',
            },
            denominator: {
                label: 'Quantité commandée',
                field: 'quantite_engagee',
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
            system: 'gpro-planning / carnet',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_dot_hot',
            frequency: 'Temps réel',
            status: 'live',
        },
        period: 'jour',
    },
    respect_plan: {
        id: '336',
        label: 'Respect Planif.',
        description:
            "(qte réaliser / objectif journalier) par chaine de montage",
        formula: {
            numerator: {
                label: 'Quantité réalisée',
                field: 'quantite_realisee',
            },
            denominator: {
                label: 'Objectif journalier',
                field: 'Non mappé',
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
            system: 'gpro-planning / carnet',
            novacityEndpoint: 'GET /api/data/q/etat_avancement',
            mysqlTable: 'etat_avancement',
            frequency: 'Temps réel',
            status: 'live',
        },
        period: 'jour',
    },
    lead_time: {
        id: '337',
        label: 'Lead Time Global',
        description:
            'STRH + LT TRANSPORT',
        formula: {
            numerator: {
                label: 'Moyenne jours transfert',
                field: 'MoyenneJours',
            },
            denominator: {
                label: '(Moyenne)',
                field: 'Non mappé',
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
            system: 'gpro-planning / carnet',
            novacityEndpoint: 'GET /api/data/q/moyenne_date_de_transfert_date_de_reservation',
            mysqlTable: 'moyenne_date_transfert',
            frequency: 'Temps réel',
            status: 'live',
        },
        period: 'jour',
    },

    // ── Stock Reliability (F-REQ-313/314/315) ──────────────────────────────
    stock_reliability_acc: {
        id: '313',
        label: 'Taux de fiabilité stock accessoires',
        description:
            '(Quantité physique / Quantité dans le système) × 100',
        formula: {
            numerator: { label: 'Quantité physique', field: 'Qtte' },
            denominator: { label: 'Quantité dans le système', field: 'qtteReserve' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 99.5, operator: '>' },
        thresholds: { green: '≥ 99,5%', orange: '98% – 99,5%', red: '< 98%' },
        source: { system: 'DIVA / DRIVE', novacityEndpoint: 'GET /api/data/diva_stock', mysqlTable: 'diva_stock', frequency: 'Journalier', status: 'live' },
        period: 'jour',
    },
    stock_reliability_tissu: {
        id: '314',
        label: 'Taux de fiabilité stock tissu',
        description:
            '(Quantité physique / Quantité dans le système) × 100',
        formula: {
            numerator: { label: 'Quantité physique', field: 'Qtte' },
            denominator: { label: 'Quantité dans le système', field: 'qtteReserve' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 99.5, operator: '>' },
        thresholds: { green: '≥ 99,5%', orange: '98% – 99,5%', red: '< 98%' },
        source: { system: 'DIVA / DRIVE', novacityEndpoint: 'GET /api/data/diva_stock', mysqlTable: 'diva_stock', frequency: 'Journalier', status: 'live' },
        period: 'jour',
    },
    stock_reliability_fg: {
        id: '315',
        label: 'Taux de fiabilité stock FG',
        description:
            '(Quantité physique / Quantité dans le système) × 100',
        formula: {
            numerator: { label: 'Quantité physique', field: 'Qtte' },
            denominator: { label: 'Quantité dans le système', field: 'qtteReserve' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 99.5, operator: '>' },
        thresholds: { green: '≥ 99,5%', orange: '98% – 99,5%', red: '< 98%' },
        source: { system: 'DRIVE / DIVA', novacityEndpoint: 'GET /api/data/diva_stock', mysqlTable: 'diva_stock', frequency: 'Journalier', status: 'live' },
        period: 'jour',
    },

    // ── Rotation Stock (F-REQ-316/317/318) ─────────────────────────────────
    rotation_acc: {
        id: '316',
        label: 'Taux de rotation stock accessoires',
        description: 'Coût des marchandises / Stock moyen',
        formula: {
            numerator: { label: 'Coût des marchandises', field: 'Non mappé' },
            denominator: { label: 'Stock moyen', field: 'StockMoyen' },
            multiplier: 1,
            resultUnit: '',
        },
        target: { value: 0, operator: '>' },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/stock_moyen', mysqlTable: 'stock_moyen', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    rotation_tissu: {
        id: '317',
        label: 'Taux de rotation stock tissu',
        description: 'Coût des marchandises / Stock moyen',
        formula: {
            numerator: { label: 'Coût des marchandises', field: 'Non mappé' },
            denominator: { label: 'Stock moyen', field: 'StockMoyen' },
            multiplier: 1,
            resultUnit: '',
        },
        target: { value: 0, operator: '>' },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/stock_moyen', mysqlTable: 'stock_moyen', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    rotation_fg: {
        id: '318',
        label: 'Taux de rotation stock FG',
        description: 'Coût des marchandises / Stock moyen',
        formula: {
            numerator: { label: 'Coût des marchandises', field: 'Non mappé' },
            denominator: { label: 'Stock moyen', field: 'StockMoyen' },
            multiplier: 1,
            resultUnit: '',
        },
        target: { value: 0, operator: '>' },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/stock_moyen', mysqlTable: 'stock_moyen', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },

    // ── Stock Mort (F-REQ-319/320/321) ─────────────────────────────────────
    stock_mort_acc: {
        id: '319',
        label: 'Taux de stock mort accessoires',
        description: "(Valeur des articles sans mouvement durant 365 / la valeur total du stock) × 100",
        formula: {
            numerator: { label: 'Valeur articles sans mouvement 365j', field: 'Qtte_SansMvt_365j' },
            denominator: { label: 'Valeur totale du stock', field: 'Quantite_Totale_Stock' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 10, operator: '<=' },
        thresholds: { green: '≤ 10%', orange: '10% – 12%', red: '> 12%' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/articles_sans_mouvement_durant_365_jours', mysqlTable: 'articles_sans_mouvement', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    stock_mort_tissu: {
        id: '320',
        label: 'Taux de stock mort tissu',
        description: "(Valeur des articles sans mouvement durant 365 / la valeur total du stock) × 100",
        formula: {
            numerator: { label: 'Valeur articles sans mouvement 365j', field: 'Qtte_SansMvt_365j' },
            denominator: { label: 'Valeur totale du stock', field: 'Quantite_Totale_Stock' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 10, operator: '<=' },
        thresholds: { green: '≤ 10%', orange: '10% – 12%', red: '> 12%' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/articles_sans_mouvement_durant_365_jours', mysqlTable: 'articles_sans_mouvement', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    stock_mort_fg: {
        id: '321',
        label: 'Taux de stock mort stock FG',
        description: "(Valeur des articles sans mouvement durant 365 / la valeur total du stock) × 100",
        formula: {
            numerator: { label: 'Valeur articles sans mouvement 365j', field: 'Qtte_SansMvt_365j' },
            denominator: { label: 'Valeur totale du stock', field: 'Quantite_Totale_Stock' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 10, operator: '<=' },
        thresholds: { green: '≤ 10%', orange: '10% – 12%', red: '> 12%' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/articles_sans_mouvement_durant_365_jours', mysqlTable: 'articles_sans_mouvement', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },

    // ── Occupation (F-REQ-322/323/324) ─────────────────────────────────────
    occupation_acc: {
        id: '322',
        label: "Taux d'occupation Accessoires",
        description: "(Nombre de rouleaux / Capacité de stockage en nombre des Colis) × 100",
        formula: {
            numerator: { label: 'Nombre de rouleaux', field: 'NbRouleaux' },
            denominator: { label: 'Capacité de stockage', field: 'Total_Conteneurs' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 85, operator: '<=' },
        thresholds: { green: '≤ 85%', orange: '85% – 95%', red: '> 95%' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/nombre_de_rouleaux + GET /api/data/q/capacite_de_stockage_en_nombre_de_conteneurs', mysqlTable: 'nombre_rouleaux + capacite_stockage', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    occupation_tissu: {
        id: '323',
        label: "Taux d'occupation tissu",
        description: "(Nombre de rouleaux / Capacité de stockage en nombre des Colis) × 100",
        formula: {
            numerator: { label: 'Nombre de rouleaux', field: 'NbRouleaux' },
            denominator: { label: 'Capacité de stockage', field: 'Total_Conteneurs' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 85, operator: '<=' },
        thresholds: { green: '≤ 85%', orange: '85% – 95%', red: '> 95%' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/nombre_de_rouleaux + GET /api/data/q/capacite_de_stockage_en_nombre_de_conteneurs', mysqlTable: 'nombre_rouleaux + capacite_stockage', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    occupation_fg: {
        id: '324',
        label: "Taux d'occupation stock FG",
        description: "(Nombre de rouleaux / Capacité de stockage en nombre des Colis) × 100",
        formula: {
            numerator: { label: 'Nombre de rouleaux', field: 'NbRouleaux' },
            denominator: { label: 'Capacité de stockage', field: 'Total_Conteneurs' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 85, operator: '<=' },
        thresholds: { green: '≤ 85%', orange: '85% – 95%', red: '> 95%' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/nombre_de_rouleaux + GET /api/data/q/capacite_de_stockage_en_nombre_de_conteneurs', mysqlTable: 'nombre_rouleaux + capacite_stockage', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },

    // ── Livraison à temps (F-REQ-325/326/327) ──────────────────────────────
    livraison_acc: {
        id: '325',
        label: 'Taux de commandes livrées à temps Accessoires',
        description: "Nombre de commandes livrée dont la date de transfert (transfert coupe + transfert coupe Jemmel)",
        formula: {
            numerator: { label: 'OFs avec transfert coupe', field: 'OF_AvecTransfertCoupe_Total' },
            denominator: { label: 'OFs livrés total', field: 'Non mappé' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 80, operator: '>=' },
        thresholds: { green: '≥ 80%', orange: '70% – 80%', red: '< 70%' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel', mysqlTable: 'nombre_ofs_livres', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    livraison_tissu: {
        id: '326',
        label: 'Taux de commandes livrées à temps tissu',
        description: "Nombre de commandes livrée dont la date de transfert (transfert coupe + transfert coupe Jemmel)",
        formula: {
            numerator: { label: 'OFs avec transfert coupe', field: 'OF_AvecTransfertCoupe_Total' },
            denominator: { label: 'OFs livrés total', field: 'Non mappé' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 80, operator: '>=' },
        thresholds: { green: '≥ 80%', orange: '70% – 80%', red: '< 70%' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel', mysqlTable: 'nombre_ofs_livres', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    livraison_fg: {
        id: '327',
        label: 'Taux de commandes livrées à temps stock FG',
        description: "Nombre de commandes livrée dont la date de transfert (transfert coupe + transfert coupe Jemmel)",
        formula: {
            numerator: { label: 'OFs avec transfert coupe', field: 'OF_AvecTransfertCoupe_Total' },
            denominator: { label: 'OFs livrés total', field: 'Non mappé' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 80, operator: '>=' },
        thresholds: { green: '≥ 80%', orange: '70% – 80%', red: '< 70%' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel', mysqlTable: 'nombre_ofs_livres', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },

    // ── Délai de livraison (F-REQ-328/329/330) ─────────────────────────────
    delai_acc: {
        id: '328',
        label: "Délai de livraison d'une commande Accessoires",
        description: "Moyen (date de transfert − date de réservation)",
        formula: {
            numerator: { label: 'Moyenne jours transfert', field: 'MoyenneJours' },
            denominator: { label: '(Moyenne)', field: 'Non mappé' },
            multiplier: 1,
            resultUnit: ' j',
        },
        target: { value: 1, operator: '<=' },
        thresholds: { green: '≤ 1 jour', orange: '1 – 3 jours', red: '> 3 jours' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/moyenne_date_de_transfert_date_de_reservation', mysqlTable: 'moyenne_date_transfert', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    delai_tissu: {
        id: '329',
        label: "Délai de livraison d'une commande tissu",
        description: "Moyen (date de transfert − date de réservation)",
        formula: {
            numerator: { label: 'Moyenne jours transfert', field: 'MoyenneJours' },
            denominator: { label: '(Moyenne)', field: 'Non mappé' },
            multiplier: 1,
            resultUnit: ' j',
        },
        target: { value: 1, operator: '<=' },
        thresholds: { green: '≤ 1 jour', orange: '1 – 3 jours', red: '> 3 jours' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/moyenne_date_de_transfert_date_de_reservation', mysqlTable: 'moyenne_date_transfert', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    delai_fg: {
        id: '330',
        label: "Délai de livraison d'une commande stock FG",
        description: "Moyen (date de transfert − date de réservation)",
        formula: {
            numerator: { label: 'Moyenne jours transfert', field: 'MoyenneJours' },
            denominator: { label: '(Moyenne)', field: 'Non mappé' },
            multiplier: 1,
            resultUnit: ' j',
        },
        target: { value: 1, operator: '<=' },
        thresholds: { green: '≤ 1 jour', orange: '1 – 3 jours', red: '> 3 jours' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/moyenne_date_de_transfert_date_de_reservation', mysqlTable: 'moyenne_date_transfert', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },

    // ── Stock / Catégories (F-REQ-331/332/333) ─────────────────────────────
    stock_typologie: {
        id: '331',
        label: 'STOCK/Typologie',
        description: "(Valeur par Typologie fournitures / Valeur total de stock) × 100",
        formula: {
            numerator: { label: 'Valeur par Typologie', field: 'Quantite (filtré par Typologie)' },
            denominator: { label: 'Valeur totale stock', field: 'Quantite_Totale_Stock' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 0, operator: '>' },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/quantite_par_typologie_fournitures', mysqlTable: 'quantite_par_typologie', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    stock_provenance: {
        id: '332',
        label: 'STOCK/provenance',
        description: "(Valeur par provenance / Valeur total Stock) × 100",
        formula: {
            numerator: { label: 'Valeur par provenance', field: 'Quantite (filtré par Provenance)' },
            denominator: { label: 'Valeur totale stock', field: 'Quantite (Provenance = null = total)' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 0, operator: '>' },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/quantite_par_provenance_total', mysqlTable: 'quantite_par_provenance', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
    stock_brand: {
        id: '333',
        label: 'STOCK/Brand',
        description: "(Valeur Par famille FG (ex : NABAIJI ; DOMYOS ; …) / Valeur Total Stock) × 100",
        formula: {
            numerator: { label: 'Valeur par famille FG', field: 'Quantite (filtré par FamilleFG)' },
            denominator: { label: 'Valeur totale stock', field: 'Quantite (FamilleFG = null = total)' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 0, operator: '>' },
        thresholds: { green: 'N/A', orange: 'N/A', red: 'N/A' },
        source: { system: 'DIVA', novacityEndpoint: 'GET /api/data/q/quantite_par_famille', mysqlTable: 'quantite_par_famille', frequency: 'Temps réel', status: 'live' },
        period: 'jour',
    },
};
