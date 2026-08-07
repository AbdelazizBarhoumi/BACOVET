// DAX IntelliSense: context-aware autocompletion for the New measure
// formula bar, modelled on Power BI's suggestion engine.

export type DaxSuggestionKind = 'function' | 'table' | 'column' | 'measure';

export type DaxSuggestion = {
    kind: DaxSuggestionKind;
    label: string;
    detail?: string;
    group?: string;
    /** text to insert at the token position */
    insert: string;
    /** extra cursor offset from the end of the inserted text */
    cursorAdjust?: number;
};

export type DaxCompletion = {
    suggestions: DaxSuggestion[];
    /** start of the token being completed */
    from: number;
    /** end of the token being completed (cursor position) */
    to: number;
};

export type DaxFunction = {
    name: string;
    signature: string;
    group: string;
    description?: string;
};

export const DAX_FUNCTIONS: DaxFunction[] = [
    {
        name: 'SUM',
        signature: 'SUM(<column>)',
        group: 'Agrégations',
        description: 'Additionne tous les nombres d’une colonne',
    },
    {
        name: 'SUMX',
        signature: 'SUMX(<table>,<expression>)',
        group: 'Agrégations',
        description:
            'Renvoie la somme d’une expression évaluée pour chaque ligne',
    },
    {
        name: 'AVERAGE',
        signature: 'AVERAGE(<column>)',
        group: 'Agrégations',
        description: 'Renvoie la moyenne (arithmétique) d’une colonne',
    },
    {
        name: 'AVG',
        signature: 'AVG(<column>)',
        group: 'Agrégations',
        description: 'Alias de AVERAGE',
    },
    {
        name: 'AVERAGEA',
        signature: 'AVERAGEA(<column>)',
        group: 'Agrégations',
        description: 'Moyenne incluant les cellules de texte/booléennes',
    },
    {
        name: 'AVERAGEX',
        signature: 'AVERAGEX(<table>,<expression>)',
        group: 'Agrégations',
        description: 'Moyenne d’une expression calculée ligne par ligne',
    },
    {
        name: 'COUNTX',
        signature: 'COUNTX(<table>,<expression>)',
        group: 'Agrégations',
        description: 'Compte les lignes où l’expression n’est pas vide',
    },
    {
        name: 'MINX',
        signature: 'MINX(<table>,<expression>)',
        group: 'Agrégations',
        description: 'Plus petite valeur d’une expression ligne par ligne',
    },
    {
        name: 'MAXX',
        signature: 'MAXX(<table>,<expression>)',
        group: 'Agrégations',
        description: 'Plus grande valeur d’une expression ligne par ligne',
    },
    {
        name: 'PRODUCTX',
        signature: 'PRODUCTX(<table>,<expression>)',
        group: 'Agrégations',
        description: 'Multiplie une expression ligne par ligne',
    },
    {
        name: 'COUNT',
        signature: 'COUNT(<column>)',
        group: 'Agrégations',
        description: 'Compte le nombre de lignes numériques non vides',
    },
    {
        name: 'COUNTA',
        signature: 'COUNTA(<column>)',
        group: 'Agrégations',
        description: 'Compte les cellules non vides de n’importe quel type',
    },
    {
        name: 'COUNTROWS',
        signature: 'COUNTROWS(<table>)',
        group: 'Agrégations',
        description: 'Compte les lignes d’une table',
    },
    {
        name: 'DISTINCTCOUNT',
        signature: 'DISTINCTCOUNT(<column>)',
        group: 'Agrégations',
        description: 'Compte les valeurs distinctes d’une colonne',
    },
    {
        name: 'MIN',
        signature: 'MIN(<column>)',
        group: 'Agrégations',
        description: 'Renvoie la plus petite valeur numérique',
    },
    {
        name: 'MAX',
        signature: 'MAX(<column>)',
        group: 'Agrégations',
        description: 'Renvoie la plus grande valeur numérique',
    },
    {
        name: 'MEDIAN',
        signature: 'MEDIAN(<column>)',
        group: 'Agrégations',
        description: 'Renvoie la médiane d’une colonne',
    },
    {
        name: 'PRODUCT',
        signature: 'PRODUCT(<column>)',
        group: 'Agrégations',
        description: 'Multiplie tous les nombres d’une colonne',
    },
    {
        name: 'CALCULATE',
        signature: 'CALCULATE(<measure>,<filter>)',
        group: 'Filtre',
        description: 'Évalue une expression avec des filtres modifiés',
    },
    {
        name: 'FILTER',
        signature: 'FILTER(<table>,<condition>)',
        group: 'Filtre',
        description: 'Renvoie une table filtrée par une condition',
    },
    {
        name: 'ALL',
        signature: 'ALL(<table>|<column>)',
        group: 'Filtre',
        description: 'Supprime tous les filtres d’une table ou d’une colonne',
    },
    {
        name: 'ALLEXCEPT',
        signature: 'ALLEXCEPT(<table>,<column>)',
        group: 'Filtre',
        description:
            'Supprime tous les filtres sauf sur les colonnes spécifiées',
    },
    {
        name: 'VALUES',
        signature: 'VALUES(<table>|<column>)',
        group: 'Filtre',
        description: 'Renvoie les valeurs visibles distinctes',
    },
    {
        name: 'DISTINCT',
        signature: 'DISTINCT(<column>)',
        group: 'Filtre',
        description: 'Renvoie les valeurs distinctes d’une colonne',
    },
    {
        name: 'RELATED',
        signature: 'RELATED(<column>)',
        group: 'Filtre',
        description: 'Renvoie la valeur liée d’une autre table',
    },
    {
        name: 'TOPN',
        signature: 'TOPN(<n>,<table>,<order>)',
        group: 'Filtre',
        description: 'Renvoie les n premières rangées d’une table',
    },
    {
        name: 'IF',
        signature: 'IF(<logical>,<then>[,<else>])',
        group: 'Logique',
        description: 'Renvoie une valeur quand une condition est vraie',
    },
    {
        name: 'SWITCH',
        signature: 'SWITCH(<expr>,<case>,<result>[,...])',
        group: 'Logique',
        description: 'Évalue une expression selon une liste de valeurs',
    },
    {
        name: 'AND',
        signature: 'AND(<a>,<b>)',
        group: 'Logique',
        description: 'Conjonction logique de deux expressions',
    },
    {
        name: 'OR',
        signature: 'OR(<a>,<b>)',
        group: 'Logique',
        description: 'Disjonction logique de deux expressions',
    },
    {
        name: 'NOT',
        signature: 'NOT(<logical>)',
        group: 'Logique',
        description: 'Négation d’une expression logique',
    },
    {
        name: 'IFERROR',
        signature: 'IFERROR(<value>,<fallback>)',
        group: 'Logique',
        description:
            'Renvoie une valeur de secours quand la valeur provoque une erreur',
    },
    {
        name: 'DATEADD',
        signature: 'DATEADD(<dates>,<n>,<unit>)',
        group: 'Intelligence temporelle',
        description: 'Décale un ensemble de dates',
    },
    {
        name: 'SAMEPERIODLASTYEAR',
        signature: 'SAMEPERIODLASTYEAR(<dates>)',
        group: 'Intelligence temporelle',
        description: 'Période équivalente de l’année précédente',
    },
    {
        name: 'TOTALYTD',
        signature: 'TOTALYTD(<measure>,<dates>)',
        group: 'Intelligence temporelle',
        description: 'Cumul depuis le début de l’année',
    },
    {
        name: 'TOTALMTD',
        signature: 'TOTALMTD(<measure>,<dates>)',
        group: 'Intelligence temporelle',
        description: 'Cumul depuis le début du mois',
    },
    {
        name: 'DATESYTD',
        signature: 'DATESYTD(<dates>)',
        group: 'Intelligence temporelle',
        description: 'Période depuis le début de l’année',
    },
    {
        name: 'PREVIOUSMONTH',
        signature: 'PREVIOUSMONTH(<dates>)',
        group: 'Intelligence temporelle',
        description: 'Le mois précédent',
    },
    {
        name: 'DATEDIFF',
        signature: 'DATEDIFF(<start>,<end>,<unit>)',
        group: 'Intelligence temporelle',
        description: 'Intervalle entre deux dates',
    },
    {
        name: 'CONCATENATE',
        signature: 'CONCATENATE(<a>,<b>)',
        group: 'Texte',
        description: 'Concatène deux valeurs de texte',
    },
    {
        name: 'LEFT',
        signature: 'LEFT(<text>,<n>)',
        group: 'Texte',
        description: 'Caractères les plus à gauche d’une chaîne',
    },
    {
        name: 'RIGHT',
        signature: 'RIGHT(<text>,<n>)',
        group: 'Texte',
        description: 'Caractères les plus à droite d’une chaîne',
    },
    {
        name: 'MID',
        signature: 'MID(<text>,<start>,<n>)',
        group: 'Texte',
        description: 'Sous-chaîne d’une chaîne',
    },
    {
        name: 'LEN',
        signature: 'LEN(<text>)',
        group: 'Texte',
        description: 'Longueur d’une chaîne',
    },
    {
        name: 'UPPER',
        signature: 'UPPER(<text>)',
        group: 'Texte',
        description: 'Convertit une chaîne en majuscules',
    },
    {
        name: 'LOWER',
        signature: 'LOWER(<text>)',
        group: 'Texte',
        description: 'Convertit une chaîne en minuscules',
    },
    {
        name: 'TRIM',
        signature: 'TRIM(<text>)',
        group: 'Texte',
        description: 'Supprime les espaces superflus',
    },
    {
        name: 'FORMAT',
        signature: 'FORMAT(<value>,<format>)',
        group: 'Texte',
        description: 'Formate une valeur sous forme de texte',
    },
    {
        name: 'SUBSTITUTE',
        signature: 'SUBSTITUTE(<text>,<old>,<new>)',
        group: 'Texte',
        description: 'Remplace les occurrences d’une chaîne',
    },
    {
        name: 'SEARCH',
        signature: 'SEARCH(<find>,<text>)',
        group: 'Texte',
        description: 'Position d’une chaîne dans un texte',
    },
    {
        name: 'VALUE',
        signature: 'VALUE(<text>)',
        group: 'Texte',
        description: 'Convertit un texte en nombre',
    },
    {
        name: 'ABS',
        signature: 'ABS(<n>)',
        group: 'Math',
        description: 'Valeur absolue',
    },
    {
        name: 'ROUND',
        signature: 'ROUND(<n>,<digits>)',
        group: 'Math',
        description: 'Arrondit un nombre',
    },
    {
        name: 'ROUNDUP',
        signature: 'ROUNDUP(<n>,<digits>)',
        group: 'Math',
        description: 'Arrondit au supérieur',
    },
    {
        name: 'ROUNDDOWN',
        signature: 'ROUNDDOWN(<n>,<digits>)',
        group: 'Math',
        description: 'Arrondit à l’inférieur',
    },
    {
        name: 'DIVIDE',
        signature: 'DIVIDE(<num>,<den>[,...])',
        group: 'Math',
        description: 'Division sûre avec résultat alternatif',
    },
    {
        name: 'POWER',
        signature: 'POWER(<n>,<p>)',
        group: 'Math',
        description: 'Élève un nombre à une puissance',
    },
    {
        name: 'SQRT',
        signature: 'SQRT(<n>)',
        group: 'Math',
        description: 'Racine carrée',
    },
    {
        name: 'INT',
        signature: 'INT(<n>)',
        group: 'Math',
        description: 'Arrondit au nombre entier inférieur',
    },
    {
        name: 'MOD',
        signature: 'MOD(<n>,<d>)',
        group: 'Math',
        description: 'Reste d’une division',
    },
    {
        name: 'SIGN',
        signature: 'SIGN(<n>)',
        group: 'Math',
        description: 'Signe d’un nombre',
    },
    {
        name: 'YEAR',
        signature: 'YEAR(<date>)',
        group: 'Date',
        description: 'Année d’une date',
    },
    {
        name: 'MONTH',
        signature: 'MONTH(<date>)',
        group: 'Date',
        description: 'Mois d’une date',
    },
    {
        name: 'DAY',
        signature: 'DAY(<date>)',
        group: 'Date',
        description: 'Jour d’une date',
    },
    {
        name: 'TODAY',
        signature: 'TODAY()',
        group: 'Date',
        description: 'Date actuelle',
    },
    {
        name: 'NOW',
        signature: 'NOW()',
        group: 'Date',
        description: 'Date et heure actuelles',
    },
    {
        name: 'WEEKDAY',
        signature: 'WEEKDAY(<date>)',
        group: 'Date',
        description: 'Jour de la semaine',
    },
    {
        name: 'EOMONTH',
        signature: 'EOMONTH(<date>,<months>)',
        group: 'Date',
        description: 'Dernier jour du mois',
    },
    {
        name: 'DATE',
        signature: 'DATE(<year>,<month>,<day>)',
        group: 'Date',
        description: 'Construit une date à partir de ses composants',
    },
];

