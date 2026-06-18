export type DevKpiKey =
    | 'dev_rft'
    | 'dev_livraison'
    | 'dev_nomenclature'
    | 'dev_reclamations'
    | 'dev_leadtime';

export interface DevKpiDetailConfig {
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
        mysqlTable: string | null;
        frequency: string;
        status: 'live' | 'pending' | 'google_drive';
    };
    period: string;
}

export const DEV_KPI_CONFIG: Record<DevKpiKey, DevKpiDetailConfig> = {
    dev_rft: {
        id: '350',
        label: 'RFT Développement (Right First Time)',
        description:
            "Pourcentage de modèles validés dès le premier échantillon lors de la phase de développement.",
        formula: {
            numerator: {
                label: 'Modèles validés 1er coup',
                field: 'modeles_valides_1er_coup',
            },
            denominator: {
                label: 'Total modèles envoyés',
                field: 'total_modeles',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 95, operator: '>=' },
        thresholds: {
            green: '≥ 95%',
            orange: '92% – 95%',
            red: '< 92%',
        },
        source: {
            system: 'Google Drive / Google Sheets',
            mysqlTable: 'manual_kpi_values (dev_rft)',
            frequency: 'Mensuelle',
            status: 'google_drive',
        },
        period: 'Mensuelle',
    },

    dev_livraison: {
        id: '351',
        label: 'Respect Livraison à Date',
        description:
            "Capacité du service Développement à livrer les modèles dans les délais convenus.",
        formula: {
            numerator: {
                label: 'Modèles livrés à date',
                field: 'modeles_livres_a_date',
            },
            denominator: {
                label: 'Total modèles envoyés',
                field: 'total_modeles',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 95, operator: '>=' },
        thresholds: {
            green: '≥ 95%',
            orange: '92% – 95%',
            red: '< 92%',
        },
        source: {
            system: 'Google Drive / Google Sheets',
            mysqlTable: 'manual_kpi_values (dev_livraison)',
            frequency: 'Mensuelle',
            status: 'google_drive',
        },
        period: 'Mensuelle',
    },

    dev_nomenclature: {
        id: '352',
        label: 'Fiabilité Nomenclature',
        description:
            "Pourcentage de nomenclatures valides et fiables par rapport au total des nomenclatures traitées.",
        formula: {
            numerator: {
                label: 'Nomenclatures fiables',
                field: 'nomenclatures_fiables',
            },
            denominator: {
                label: 'Total nomenclatures',
                field: 'total_nomenclatures',
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
            system: 'Google Drive / Google Sheets',
            mysqlTable: 'manual_kpi_values (dev_nomenclature)',
            frequency: 'Mensuelle',
            status: 'google_drive',
        },
        period: 'Mensuelle',
    },

    dev_reclamations: {
        id: '353',
        label: '% Réclamations Production',
        description:
            "Pourcentage de modèles réclamés par la production par rapport au total des modèles traités.",
        formula: {
            numerator: {
                label: 'Modèles réclamés',
                field: 'modeles_reclames',
            },
            denominator: {
                label: 'Total modèles',
                field: 'total_modeles',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 2, operator: '<=' },
        thresholds: {
            green: '< 2%',
            orange: '2% – 3%',
            red: '> 3%',
        },
        source: {
            system: 'Google Drive / Google Sheets',
            mysqlTable: 'manual_kpi_values (dev_reclamations)',
            frequency: 'Mensuelle',
            status: 'google_drive',
        },
        period: 'Mensuelle',
    },

    dev_leadtime: {
        id: '354',
        label: 'Lead Time Développement',
        description:
            "Délai moyen entre la date de livraison prévue et la date de livraison réelle des modèles en développement. Valeur positive = retard, négative = en avance.",
        formula: {
            numerator: {
                label: 'Somme des écarts (jours)',
                field: 'SUM(date_livraison_reelle - date_livraison_prevue)',
            },
            denominator: {
                label: 'Nombre de modèles livrés',
                field: 'COUNT(both dates not null)',
            },
            multiplier: 1,
            resultUnit: 'j',
        },
        target: { value: 0, operator: '<=' },
        thresholds: {
            green: '≤ 0j (en avance ou à temps)',
            orange: '1 – 7j de retard',
            red: '> 7j de retard',
        },
        source: {
            system: 'Google Drive / Google Sheets',
            mysqlTable: 'sync_drive_development',
            frequency: 'Mensuelle',
            status: 'google_drive',
        },
        period: 'Mensuelle',
    },

};
