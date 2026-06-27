import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:22
 * @route '/logistics/kpis'
 */
export const kpis = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})

kpis.definition = {
    methods: ["get","head"],
    url: '/logistics/kpis',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:22
 * @route '/logistics/kpis'
 */
kpis.url = (options?: RouteQueryOptions) => {
    return kpis.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:22
 * @route '/logistics/kpis'
 */
kpis.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:22
 * @route '/logistics/kpis'
 */
kpis.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: kpis.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:22
 * @route '/logistics/kpis'
 */
    const kpisForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: kpis.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:22
 * @route '/logistics/kpis'
 */
        kpisForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: kpis.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:22
 * @route '/logistics/kpis'
 */
        kpisForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: kpis.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    kpis.form = kpisForm
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:196
 * @route '/logistics/stock-kpis'
 */
export const stockKpis = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockKpis.url(options),
    method: 'get',
})

stockKpis.definition = {
    methods: ["get","head"],
    url: '/logistics/stock-kpis',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:196
 * @route '/logistics/stock-kpis'
 */
stockKpis.url = (options?: RouteQueryOptions) => {
    return stockKpis.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:196
 * @route '/logistics/stock-kpis'
 */
stockKpis.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockKpis.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:196
 * @route '/logistics/stock-kpis'
 */
stockKpis.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: stockKpis.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:196
 * @route '/logistics/stock-kpis'
 */
    const stockKpisForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: stockKpis.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:196
 * @route '/logistics/stock-kpis'
 */
        stockKpisForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockKpis.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:196
 * @route '/logistics/stock-kpis'
 */
        stockKpisForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockKpis.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    stockKpis.form = stockKpisForm
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:279
 * @route '/logistics/stock-composition'
 */
export const stockComposition = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockComposition.url(options),
    method: 'get',
})

stockComposition.definition = {
    methods: ["get","head"],
    url: '/logistics/stock-composition',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:279
 * @route '/logistics/stock-composition'
 */
stockComposition.url = (options?: RouteQueryOptions) => {
    return stockComposition.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:279
 * @route '/logistics/stock-composition'
 */
stockComposition.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockComposition.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:279
 * @route '/logistics/stock-composition'
 */
stockComposition.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: stockComposition.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:279
 * @route '/logistics/stock-composition'
 */
    const stockCompositionForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: stockComposition.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:279
 * @route '/logistics/stock-composition'
 */
        stockCompositionForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockComposition.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:279
 * @route '/logistics/stock-composition'
 */
        stockCompositionForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockComposition.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    stockComposition.form = stockCompositionForm
/**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:329
 * @route '/logistics/ofs'
 */
export const ofs = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: ofs.url(options),
    method: 'get',
})

ofs.definition = {
    methods: ["get","head"],
    url: '/logistics/ofs',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:329
 * @route '/logistics/ofs'
 */
ofs.url = (options?: RouteQueryOptions) => {
    return ofs.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:329
 * @route '/logistics/ofs'
 */
ofs.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: ofs.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:329
 * @route '/logistics/ofs'
 */
ofs.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: ofs.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:329
 * @route '/logistics/ofs'
 */
    const ofsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: ofs.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:329
 * @route '/logistics/ofs'
 */
        ofsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: ofs.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:329
 * @route '/logistics/ofs'
 */
        ofsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: ofs.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    ofs.form = ofsForm
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:416
 * @route '/logistics/stock-reliability'
 */
export const stockReliability = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockReliability.url(options),
    method: 'get',
})

stockReliability.definition = {
    methods: ["get","head"],
    url: '/logistics/stock-reliability',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:416
 * @route '/logistics/stock-reliability'
 */
stockReliability.url = (options?: RouteQueryOptions) => {
    return stockReliability.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:416
 * @route '/logistics/stock-reliability'
 */
stockReliability.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockReliability.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:416
 * @route '/logistics/stock-reliability'
 */
stockReliability.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: stockReliability.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:416
 * @route '/logistics/stock-reliability'
 */
    const stockReliabilityForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: stockReliability.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:416
 * @route '/logistics/stock-reliability'
 */
        stockReliabilityForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockReliability.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:416
 * @route '/logistics/stock-reliability'
 */
        stockReliabilityForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockReliability.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    stockReliability.form = stockReliabilityForm
const LogisticsController = { kpis, stockKpis, stockComposition, ofs, stockReliability }

export default LogisticsController