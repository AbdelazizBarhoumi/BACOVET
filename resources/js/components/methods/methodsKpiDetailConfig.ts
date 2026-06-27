export type MethodsKpiKey = 'f_req_216' | 'f_req_217' | 'f_req_218' | 'f_req_219';

export interface MethodsKpiDetailConfig {
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
    period: string;
}

export const METHODS_KPI_CONFIG: Record<MethodsKpiKey, MethodsKpiDetailConfig> = {
    f_req_216: {
        id: '216',
        label: "Taux d'archivage suivi paquets",
        description:
            "(Nbre des OF soldés archivés / nbr des Ofs soldés) × 100",
        formula: {
            numerator: {
                label: 'Nombre OF soldés archivés',
                field: 'est_archive',
            },
            denominator: {
                label: 'Nombre total OF soldés',
                field: 'est_solde',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 85, operator: '>=' },
        thresholds: {
            green: '≥ 85%',
            orange: '70% – 85%',
            red: '< 70%',
        },
        source: {
            system: 'Base suivi production',
            novacityEndpoint: 'GET /api/data/ofabrication + GET /api/data/q/etat_avancement',
            mysqlTable: 'sync_gpro_suivi_paquets',
            frequency: 'Journalière',
            status: 'live',
        },
        period: 'Journalière',
    },

    f_req_217: {
        id: '217',
        label: 'Taux de fiabilité des données système par OF',
        description:
            'Différence entre tagging réel et sortie fin chaine',
        formula: {
            numerator: {
                label: 'Tag réel',
                field: 'tag_reel',
            },
            denominator: {
                label: 'Sortie fin chaine',
                field: 'sortie_jour',
            },
            multiplier: 1,
            resultUnit: '%',
        },
        target: { value: 95, operator: '>=' },
        thresholds: {
            green: '|ecart_pct| ≤ 2%',
            orange: '|ecart_pct| 2% – 5%',
            red: '|ecart_pct| > 5%',
        },
        source: {
            system: 'GPRO',
            novacityEndpoint: 'GET /api/data/q/taging_reel + GET /api/data/q/wip_chaine',
            mysqlTable: 'taging_reel + wip_chaine',
            frequency: 'Journalière',
            status: 'live',
        },
        period: 'Journalière',
    },

    f_req_218: {
        id: '218',
        label: 'Taux de respect du temps estimé par ARTICLE',
        description:
            "Temps cotation − Temps prod = / > 0 minute",
        formula: {
            numerator: {
                label: 'Articles respectant le temps estimé',
                field: 'respect_count',
            },
            denominator: {
                label: 'Temps production',
                field: 'heures_prod',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 90, operator: '>=' },
        thresholds: {
            green: '≥ 90%',
            orange: '80% – 90%',
            red: '< 80%',
        },
        source: {
            system: 'Base rendement + Logiciel Cotation',
            novacityEndpoint: 'GET /api/data/q/efficience_chaine',
            mysqlTable: 'sync_drive_cotation',
            frequency: 'Journalière',
            status: 'live',
        },
        period: 'Journalière',
    },

    f_req_219: {
        id: '219',
        label: 'Taux des temps acceptés dès la première version par ARTICLE',
        description:
            "(Nbr des demandes de négociation − Nbr des gammes déchiffrage) × 100",
        formula: {
            numerator: {
                label: 'Gammes acceptées V1',
                field: 'nb_gammes_acceptees_v1',
            },
            denominator: {
                label: 'Total gammes',
                field: 'nb_gammes_total',
            },
            multiplier: 100,
            resultUnit: '%',
        },
        target: { value: 80, operator: '>=' },
        thresholds: {
            green: '≥ 80%',
            orange: '60% – 80%',
            red: '< 60%',
        },
        source: {
            system: 'Fichier déchiffrage + Logiciel Cotation',
            novacityEndpoint: null,
            mysqlTable: 'sync_drive_gammes',
            frequency: 'Hebdomadaire',
            status: 'live',
        },
        period: 'Hebdomadaire',
    },
};
