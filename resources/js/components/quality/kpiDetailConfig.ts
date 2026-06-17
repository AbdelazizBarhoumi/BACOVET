export type KpiKey =
    | 'br_cgl'
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
    | 'br_commande';

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
        system: 'DIVA' | 'QCM' | 'DRIVE' | 'N/A';
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
    br_cgl: {
        id: '101',
        label: 'BR CGL — Inspection Commande (Annuel)',
        description:
            "Taux de pièces rejetées lors du contrôle final de commande depuis le début de l'année. Source: Google Drive Inspection Commande.",
        formula: {
            numerator: {
                label: 'Nombre de rejets inspection commande annuel',
                field: 'nb_rejets',
            },
            denominator: {
                label: "Nombre d'inspections commande annuel",
                field: 'nb_inspections',
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
            mysqlTable: 'sync_drive_inspection_commande',
            frequency: '4×/jour',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_gtd_jour: {
        id: '102',
        label: "BR GTD — Contrôle fin de ligne (Aujourd'hui)",
        description:
            'Taux de pièces rejetées au contrôle fin de ligne ce jour, par chaîne de production',
        formula: {
            numerator: {
                label: 'Rejets contrôle GTD',
                field: 'avg_defect_pct',
            },
            denominator: {
                label: '(Moyenne — pas un ratio)',
                field: 'AVG(defect_pct)',
            },
            multiplier: 1,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'QCM',
            novacityEndpoint: 'checkpassqte',
            mysqlTable: 'check_pass_qte',
            frequency: 'Temps réel',
            status: 'live',
        },
        breakdownAvailable: true,
        trendAvailable: true,
        period: 'jour',
        exportFields: ['chain', 'defect_pct', 'status', 'target'],
    },

    rft_jour: {
        id: '104',
        label: "RFT — Right First Time (Aujourd'hui)",
        description:
            'Pourcentage de pièces conformes produites du premier coup ce jour',
        formula: {
            numerator: {
                label: 'Pièces OK premier coup',
                field: 'first_pass_today',
            },
            denominator: {
                label: 'Pièces produites',
                field: 'produced_today',
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
            system: 'QCM',
            novacityEndpoint:
                'pieces_ok_de_premier_coup_jour_en_cours + pieces_produites_jour_en_cours',
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
        label: "BR Bundling — Inspection Paquet (Aujourd'hui)",
        description:
            "Taux de paquets rejetés lors de l'inspection bundling ce jour",
        formula: {
            numerator: {
                label: 'Rejets inspection paquet',
                field: 'bundle_reject',
            },
            denominator: {
                label: 'Inspections paquet',
                field: 'bundle_inspected',
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
            system: 'QCM',
            novacityEndpoint:
                'rejets_suite_inspection_paquet_jour_en_cours + inspections_paquet_jour_en_cours',
            mysqlTable: 'rejets_inspection_paquet (period=jour)',
            frequency: 'Temps réel',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'jour',
        exportFields: ['date', 'bundle_reject', 'bundle_inspected', 'br_pct'],
    },

    br_gtd_dda: {
        id: '103',
        label: 'BR GTD DDA — Contrôle fin de ligne (Annuel)',
        description:
            "Taux de rejet fin de ligne cumulé depuis le début de l'année par chaîne",
        formula: {
            numerator: {
                label: "Rejets GTD (depuis début d'année)",
                field: 'avg_defect_pct_year',
            },
            denominator: {
                label: '(Moyenne annuelle — pas un ratio)',
                field: 'AVG(defect_pct) YEAR',
            },
            multiplier: 1,
            resultUnit: '%',
        },
        target: { value: 5, operator: '<=' },
        thresholds: {
            green: '< 4%',
            orange: '4% – 5%',
            red: '> 5%',
        },
        source: {
            system: 'QCM',
            novacityEndpoint: 'checkpassqte (filtre YEAR)',
            mysqlTable: 'check_pass_qte',
            frequency: 'Temps réel',
            status: 'live',
        },
        breakdownAvailable: true,
        trendAvailable: true,
        period: 'annee',
        exportFields: ['month', 'avg_defect_pct', 'status'],
    },

    rft_annee: {
        id: '105',
        label: 'RFT DDA — Right First Time (Annuel)',
        description:
            "Pourcentage de pièces conformes du premier coup depuis le début de l'année",
        formula: {
            numerator: {
                label: 'Pièces OK premier coup (année)',
                field: 'first_pass_year',
            },
            denominator: {
                label: 'Pièces produites (année)',
                field: 'produced_year',
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
            system: 'QCM',
            novacityEndpoint:
                'pieces_ok_de_premier_coup_annee_en_cours + pieces_produites_annee_en_cours',
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
        label: 'BR Bundling DDA — Inspection Paquet (Annuel)',
        description: "Taux de paquets rejetés depuis le début de l'année",
        formula: {
            numerator: {
                label: 'Rejets inspection paquet (année)',
                field: 'bundle_reject_year',
            },
            denominator: {
                label: 'Inspections paquet (année)',
                field: 'bundle_inspected_year',
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
            system: 'QCM',
            novacityEndpoint: 'rejets_suite_inspection_paquet_annee_en_cours + inspections_paquet_annee_en_cours',
            mysqlTable: 'rejets_inspection_paquet (period=annee)',
            frequency: 'Temps réel',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'annee',
        exportFields: ['date', 'bundle_reject', 'bundle_inspected', 'br_pct'],
    },

    br_print: {
        id: '108',
        label: "BR Print — Inspection Livraison Sérigraphie (Aujourd'hui)",
        description:
            "Taux de rejet lors de l'inspection de livraison sérigraphie ce jour",
        formula: {
            numerator: {
                label: 'Rejets inspection sérigraphie',
                field: '—',
            },
            denominator: {
                label: 'Inspections sérigraphie',
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
        label: 'BR Print DDA — Inspection Sérigraphie (Annuel)',
        description:
            "Taux de rejet sérigraphie cumulé depuis le début de l'année",
        formula: {
            numerator: {
                label: 'Rejets inspection sérigraphie (année)',
                field: '—',
            },
            denominator: {
                label: 'Inspections sérigraphie (année)',
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
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_care_label_jour: {
        id: '110',
        label: "BR Care Label — Inspection Étiquette (Aujourd'hui)",
        description: "Taux de rejet lors de l'inspection care label ce jour",
        formula: {
            numerator: { label: 'Rejets care label', field: '—' },
            denominator: { label: 'Inspections care label', field: '—' },
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
        label: 'BR Care Label DDA — Inspection Étiquette (Annuel)',
        description:
            "Taux de rejet care label cumulé depuis le début de l'année",
        formula: {
            numerator: { label: 'Rejets care label (année)', field: '—' },
            denominator: {
                label: 'Inspections care label (année)',
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
        trendAvailable: false,
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_accessoires_jour: {
        id: '112',
        label: "BR Accessoires — Inspection Accessoires (Aujourd'hui)",
        description: "Taux de rejet lors de l'inspection accessoires ce jour",
        formula: {
            numerator: { label: 'Rejets accessoires', field: '—' },
            denominator: { label: 'Inspections accessoires', field: '—' },
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
        label: 'BR Accessoires DDA — Inspection Accessoires (Annuel)',
        description:
            "Taux de rejet accessoires cumulé depuis le début de l'année",
        formula: {
            numerator: { label: 'Rejets accessoires (année)', field: '—' },
            denominator: {
                label: 'Inspections accessoires (année)',
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
        trendAvailable: false,
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_compo_jour: {
        id: '114',
        label: "BR Compo — Inspection Composants (Aujourd'hui)",
        description: "Taux de rejet lors de l'inspection composants ce jour",
        formula: {
            numerator: { label: 'Rejets composants', field: '—' },
            denominator: { label: 'Inspections composants', field: '—' },
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
        label: 'BR Compo DDA — Inspection Composants (Annuel)',
        description:
            "Taux de rejet composants cumulé depuis le début de l'année",
        formula: {
            numerator: { label: 'Rejets composants (année)', field: '—' },
            denominator: {
                label: 'Inspections composants (année)',
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
        trendAvailable: false,
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },

    br_commande: {
        id: '101',
        label: 'BR Commande — Inspection Commande (Annuel)',
        description:
            "Taux de rejet annuel des commandes inspectées. Source: Google Drive Inspection Commande.",
        formula: {
            numerator: { label: 'Rejets inspection commande (année)', field: 'nb_rejets' },
            denominator: {
                label: 'Inspections commande (année)',
                field: 'nb_inspections',
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
            mysqlTable: 'sync_drive_inspection_commande',
            frequency: '4×/jour',
            status: 'live',
        },
        breakdownAvailable: false,
        trendAvailable: false,
        period: 'annee',
        exportFields: ['date', 'nb_rejets', 'nb_inspections'],
    },
};
