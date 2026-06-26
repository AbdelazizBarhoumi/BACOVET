export type DevKpiKey =
    | 'dev_rft'
    | 'dev_livraison'
    | 'dev_nomenclature'
    | 'dev_reclamations';

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
        label: 'RFT (RIGHT FIRST TIME)',
        description:
            "Nb des modèles validé de 1er coup / Total des modèles envoyées",
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
            system: 'DRIVE',
            mysqlTable: 'manual_kpi_values (dev_rft)',
            frequency: 'Mensuelle',
            status: 'google_drive',
        },
        period: 'Mensuelle',
    },

    dev_livraison: {
        id: '351',
        label: 'Taux de respect de livraison a date',
        description:
            "Nb des modèles env a date / totales des modèles env",
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
            system: 'DRIVE',
            mysqlTable: 'manual_kpi_values (dev_livraison)',
            frequency: 'Mensuelle',
            status: 'google_drive',
        },
        period: 'Mensuelle',
    },

    dev_nomenclature: {
        id: '352',
        label: 'Taux de fiabilité de nomenclature',
        description:
            "Nb des nomenclatures validé et fiable / totales",
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
            system: 'DRIVE',
            mysqlTable: 'manual_kpi_values (dev_nomenclature)',
            frequency: 'Mensuelle',
            status: 'google_drive',
        },
        period: 'Mensuelle',
    },

    dev_reclamations: {
        id: '353',
        label: '%réclamations de la production',
        description:
            "Nb des modèles réclamés / totales des modèles",
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
            system: 'DRIVE',
            mysqlTable: 'manual_kpi_values (dev_reclamations)',
            frequency: 'Mensuelle',
            status: 'google_drive',
        },
        period: 'Mensuelle',
    },
};
