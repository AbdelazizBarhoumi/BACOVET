export type KpiKey =
'br_commande'
    | 'br_gtd_jour'
    | 'rft_jour'
    | 'br_bundling_jour'
    | 'br_gtd_dda'
    | 'rft_annee'
    | 'br_bundling_annee'
    | 'br_print'
    | 'br_print_dda'
    | 'br_care_label_jour'
    | 'br_care_label_dda'
    | 'br_accessoires_jour'
    | 'br_accessoires_dda'
    | 'br_compo_jour'
    | 'br_compo_dda'
    | 'br_in_jour'
    | 'br_in_dda';

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
        system: 'DIVA' | 'gpro-prod' | 'DRIVE' | 'N/A';
        novacityEndpoint: string | null;
        mysqlTable: string | null;
        frequency: string;
        status: 'live' | 'pending' | 'inactive' | 'google_drive';
    };
    breakdownAvailable: boolean;
    trendAvailable: boolean;
    period: 'jour' | 'annee';
    exportFields: string[];
}

export const KPI_DETAIL_CONFIG: Record<KpiKey, KpiDetailConfig> = {

    br_commande: {
        id: '101',
        label: 'BR Commande',
        description: "Nombre de rejet suite inspection commande / Nombre d'inspection commande × 100 (dès le début de l'année jusqu'à présent)",
        formula: {
            numerator: {
                label: "Nombre de rejet suite inspection commande",
                field: 'Non mappé',
            },
            denominator: {
                label: "Nombre d'inspection commande",
                field: 'Non mappé',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DIVA',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_inspection_commande',
            frequency: 'Temps réel',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_gtd_jour: {
        id: '102',
        label: 'BR GTD (Jour)',
        description:
        "Nombre de rejet suite contrôle par chaîne de production / Nombre de contrôle par chaîne de production × 100 (ce jour : jour en cours)",
        formula: {
            numerator: {
                label: 'Nombre de rejet suite contrôle par chaîne de production',
                field: 'qtte',
            },
            denominator: {
                label: 'Nombre de contrôle par chaîne de production',
                field: 'total_colis',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DIVA',
            novacityEndpoint: '/api/data/q/packets_rejetes + /api/data/q/colis_total_3var',
            mysqlTable: 'packets_rejetes + colis_total_var',
            frequency: 'Temps réel',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: true,
        period: 'jour',
        exportFields: ['chain', 'defect_pct', 'status', 'target'],
    },

    rft_jour: {
        id: '104',
        label: 'RFT (Jour)',
        description:
        "Nombre des pièces Ok de premier coup par chaîne de production / Nombre des pièces produites par chaîne de production × 100 (ce jour : jour en cours)",
        formula: {
            numerator: {
                label: 'Nombre des pièces Ok de premier coup',
                field: 'FirstPassToday',
            },
            denominator: {
                label: 'Nombre des pièces produites',
                field: 'ProducedToday',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 98, operator: '>=' },
        thresholds: {
            green: '≥ 98%',
            orange: '95% – 98%',
            red: '< 95%',
        },
        source: {
            system: 'gpro-prod',
            novacityEndpoint:
            '/api/data/q/pieces_ok_de_premier_coup_jour_en_cours + /api/data/q/pieces_produites_jour_en_cours',
            mysqlTable: 'pieces_ok_jour + pieces_produites_jour',
            frequency: 'Temps réel',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: true,
        period: 'jour',
        exportFields: ['date', 'first_pass_today', 'produced_today', 'rft_pct'],
    },

    br_bundling_jour: {
        id: '106',
        label: 'BR Bundling (Jour)',
        description:
            "Nombre de rejet suite inspection Paquet / Nombre d'inspection Paquet × 100 (ce jour : le jour en cours)",
        formula: {
            numerator: {
                label: "Nombre de rejet suite inspection Paquet",
                field: 'BundleRejectToday',
            },
            denominator: {
                label: "Nombre d'inspection Paquet",
                field: 'BundleInspectedToday',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'gpro-prod',
            novacityEndpoint:
                '/api/data/q/rejets_suite_inspection_paquet_jour_en_cours + /api/data/q/inspections_paquet_jour_en_cours',
            mysqlTable: 'rejets_inspection_paquet (period=jour)',
            frequency: 'Temps réel',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: true,
        period: 'jour',
        exportFields: ['date', 'bundle_reject', 'bundle_inspected', 'br_pct'],
    },

    br_gtd_dda: {
        id: '103',
        label: 'BR GTD DDA',
        description:
        "Nombre de rejet suite contrôle RFID colis / Nombre de contrôle RFID colis annuel × 100 (par chaîne de production, dès le début de l'année jusqu'à présent)",
        formula: {
            numerator: {
                label: "Nombre de rejet suite contrôle RFID colis",
                field: 'qtte',
            },
            denominator: {
                label: "Nombre de contrôle RFID colis annuel",
                field: 'total_colis',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DIVA',
            novacityEndpoint: null,
            mysqlTable: 'check_pass_qte',
            frequency: 'Temps réel',
            status: 'inactive',
        },
        breakdownAvailable: false,
        trendAvailable: true,
        period: 'annee',
        exportFields: ['month', 'avg_defect_pct', 'status'],
    },

    rft_annee: {
        id: '105',
        label: 'RFT DDA',
        description:
        "Nombre des pièces Ok de premier coup par chaîne de production / Nombre des pièces produites par chaîne de production × 100 (dès le début de l'année jusqu'à présent)",
        formula: {
            numerator: {
                label: 'Nombre des pièces Ok de premier coup',
                field: 'FirstPassYear',
            },
            denominator: {
                label: 'Nombre des pièces produites',
                field: 'ProducedYear',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 98, operator: '>=' },
        thresholds: {
            green: '≥ 98%',
            orange: '95% – 98%',
            red: '< 95%',
        },
        source: {
            system: 'gpro-prod',
            novacityEndpoint:
            '/api/data/q/pieces_ok_de_premier_coup_annee_en_cours + /api/data/q/pieces_produites_annee_en_cours',
            mysqlTable: 'pieces_ok_annee + pieces_produites_annee',
            frequency: 'Temps réel',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: true,
        period: 'annee',
        exportFields: ['year', 'first_pass_year', 'produced_year', 'rft_pct'],
    },

    br_bundling_annee: {
        id: '107',
        label: 'BR Bundling DDA',
        description: "Nombre de rejet suite inspection Paquet / Nombre d'inspection Paquet × 100 (dès le début de l'année jusqu'à présent)",
        formula: {
            numerator: {
                label: "Nombre de rejet suite inspection Paquet",
                field: 'BundleRejectYear',
            },
            denominator: {
                label: "Nombre d'inspection Paquet",
                field: 'BundleInspectedYear',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'gpro-prod',
            novacityEndpoint: '/api/data/q/rejets_suite_inspection_paquet_annee_en_cours + /api/data/q/inspections_paquet_annee_en_cours',
            mysqlTable: 'rejets_inspection_paquet (period=annee)',
            frequency: 'Temps réel',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: true,
        period: 'annee',
        exportFields: ['date', 'bundle_reject', 'bundle_inspected', 'br_pct'],
    },

    br_print: {
        id: '108',
        label: 'BR Print (Jour)',
        description:
        "Nombre de rejet suite inspection livraison sérigraphie / Nombre d'inspection livraison sérigraphie × 100 (ce jour : le jour en cours)",
        formula: {
            numerator: {
                label: "Nombre de rejet suite inspection livraison sérigraphie",
                field: '—',
            },
            denominator: {
                label: "Nombre d'inspection livraison sérigraphie",
                field: '—',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
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
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'jour',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_print_dda: {
        id: '109',
        label: 'BR Print DDA',
        description:
        "Nombre de rejet suite inspection livraison sérigraphie / Nombre d'inspection livraison sérigraphie × 100 (dès le début de l'année jusqu'à présent)",
        formula: {
            numerator: {
                label: "Nombre de rejet suite inspection livraison sérigraphie",
                field: '—',
            },
            denominator: {
                label: "Nombre d'inspection livraison sérigraphie",
                field: '—',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
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
        breakdownAvailable: false,
        trendAvailable: true,
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_care_label_jour: {
        id: '110',
        label: 'BR Care Label (Jour)',
        description: "Nombre de rejet suite inspection livraison vignettes / Nombre d'inspection livraison vignettes × 100 (ce jour : le jour en cours)",
        formula: {
            numerator: { label: "Nombre de rejet suite inspection livraison vignettes", field: '—' },
            denominator: { label: "Nombre d'inspection livraison vignettes", field: '—' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DRIVE',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_br_care_label',
            frequency: '4×/jour',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'jour',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_care_label_dda: {
        id: '111',
        label: 'BR Care Label DDA',
        description:
        "Nombre de rejet suite inspection livraison vignettes / Nombre d'inspection livraison vignettes × 100 (dès le début de l'année jusqu'à présent)",
        formula: {
            numerator: { label: "Nombre de rejet suite inspection livraison vignettes", field: '—' },
            denominator: {
                label: "Nombre d'inspection livraison vignettes",
                field: '—',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DRIVE',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_br_care_label',
            frequency: '4×/jour',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: true,
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_accessoires_jour: {
        id: '112',
        label: 'BR Accessoires (Jour)',
        description: "Nombre de rejet suite inspection livraison accessoires / Nombre d'inspection livraison accessoires × 100 (ce jour : le jour en cours)",
        formula: {
            numerator: { label: "Nombre de rejet suite inspection livraison accessoires", field: '—' },
            denominator: { label: "Nombre d'inspection livraison accessoires", field: '—' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DRIVE',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_br_accessoires',
            frequency: '4×/jour',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'jour',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_accessoires_dda: {
        id: '113',
        label: 'BR Accessoires DDA',
        description:
        "Nombre de rejet suite inspection livraison accessoires / Nombre d'inspection livraison accessoires × 100 (dès le début de l'année jusqu'à présent)",
        formula: {
            numerator: { label: "Nombre de rejet suite inspection livraison accessoires", field: '—' },
            denominator: {
                label: "Nombre d'inspection livraison accessoires",
                field: '—',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DRIVE',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_br_accessoires',
            frequency: '4×/jour',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: true,
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_compo_jour: {
        id: '114',
        label: 'BR Compo (Jour)',
        description: "Nombre de rejet suite inspection livraison Compo / Nombre d'inspection livraison Compo × 100 (ce jour : le jour en cours)",
        formula: {
            numerator: { label: "Nombre de rejet suite inspection livraison Compo", field: '—' },
            denominator: { label: "Nombre d'inspection livraison Compo", field: '—' },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DRIVE',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_br_compo',
            frequency: '4×/jour',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'jour',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_compo_dda: {
        id: '115',
        label: 'BR Compo DDA',
        description:
        "Nombre de rejet suite inspection livraison Compo / Nombre d'inspection livraison Compo × 100 (dès le début de l'année jusqu'à présent)",
        formula: {
            numerator: { label: "Nombre de rejet suite inspection livraison Compo", field: '—' },
            denominator: {
                label: "Nombre d'inspection livraison Compo",
                field: '—',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DRIVE',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_br_compo',
            frequency: '4×/jour',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: true,
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_in_jour: {
        id: '120',
        label: 'BR IN (Jour)',
        description: "Nombre de rejet suite inspection colis / Nombre d'inspection colis × 100 (ce jour : jour en cours)",
        formula: {
            numerator: {
                label: "Nombre de rejet suite inspection colis",
                field: '—',
            },
            denominator: {
                label: "Nombre d'inspection colis",
                field: '—',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DIVA',
            novacityEndpoint: null,
            mysqlTable: null,
            frequency: '4×/jour',
            status: 'inactive',
        },
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'jour',
        exportFields: [],
    },

    br_in_dda: {
        id: '121',
        label: 'BR IN DDA',
        description: "Nombre de rejet suite inspection AQL colis / Nombre d'inspection AQL colis × 100 (dès le début de l'année jusqu'à présent)",
        formula: {
            numerator: {
                label: "Nombre de rejet suite inspection AQL colis",
                field: '—',
            },
            denominator: {
                label: "Nombre d'inspection AQL colis",
                field: '—',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'DIVA',
            novacityEndpoint: null,
            mysqlTable: null,
            frequency: '4×/jour',
            status: 'inactive',
        },
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'annee',
        exportFields: [],
    },
};
