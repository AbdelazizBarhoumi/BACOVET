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
        mysqlTable: string | null;
        frequency: string;
        status: 'live' | 'pending' | 'inactive';
    };
    period: string;
}

export const METHODS_KPI_CONFIG: Record<MethodsKpiKey, MethodsKpiDetailConfig> = {
    f_req_216: {
        id: '216',
        label: "Taux d'Archivage Suivi Paquets",
        description:
            "Pourcentage d'OF soldés archivés par rapport au total des OFs soldés. Indicateur de suivi de la traçabilité des paquets.",
        formula: {
            numerator: {
                label: 'Nombre OF soldés archivés',
                field: 'of_archived',
            },
            denominator: {
                label: 'Nombre total OF soldés',
                field: 'of_sold_total',
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
            mysqlTable: 'sync_gpro_suivi_paquets',
            frequency: 'Journalière',
            status: 'live',
        },
        period: 'Quotidienne',
    },

    f_req_217: {
        id: '217',
        label: 'Taux de Fiabilité des Données sur Système',
        description:
            "Mesure la fiabilité des données en comparant le tagging réel à la sortie fin chaîne. Calculé comme 100 - écart absolu moyen entre tag théorique et tag réel.",
        formula: {
            numerator: {
                label: '100 - écart absolu moyen',
                field: '100 - AVG(ABS(ecart_pct))',
            },
            denominator: {
                label: '(Valeur unique — pas un ratio)',
                field: '100',
            },
            multiplier: 1,
            resultUnit: '%',
        },
        target: { value: 95, operator: '>=' },
        thresholds: {
            green: '≥ 95%',
            orange: '90% – 95%',
            red: '< 90%',
        },
        source: {
            system: 'GPRO (tagging_reel)',
            mysqlTable: 'taging_reel',
            frequency: 'Journalière',
            status: 'live',
        },
        period: 'Quotidienne',
    },

    f_req_218: {
        id: '218',
        label: 'Taux de Respect du Temps Estimé par Article',
        description:
            "Pourcentage d'articles dont le temps réel de production est inférieur ou égal au temps estimé (cotation). Temps cotation − Temps prod ≥ 0. Source: Base rendement + Logiciel Cotation (Excel).",
        formula: {
            numerator: {
                label: 'Articles respectant le temps estimé',
                field: 'articles_ok',
            },
            denominator: {
                label: 'Total articles lancés',
                field: 'articles_total',
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
            mysqlTable: 'sync_drive_cotation',
            frequency: 'Au démarrage de chaque nouveau lancement',
            status: 'live',
        },
        period: 'Par lancement',
    },

    f_req_219: {
        id: '219',
        label: 'Taux des Temps Acceptés dès la Première Version',
        description:
            "Pourcentage de gammes déchiffrage acceptées sans demande de négociation. Source: Fichier déchiffrage + Logiciel Cotation.",
        formula: {
            numerator: {
                label: 'Gammes sans négociation',
                field: 'gammes_ok',
            },
            denominator: {
                label: 'Total gammes déchiffrage',
                field: 'gammes_total',
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
            system: 'Fichier déchiffrage + Logiciel Cotation',
            mysqlTable: 'sync_drive_gammes',
            frequency: 'Fichier déchiffrage',
            status: 'live',
        },
        period: 'Par fichier déchiffrage',
    },
};
