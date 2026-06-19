import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:17
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
 * @see app/Http/Controllers/Api/LogisticsController.php:17
 * @route '/logistics/kpis'
 */
kpis.url = (options?: RouteQueryOptions) => {
    return kpis.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:17
 * @route '/logistics/kpis'
 */
kpis.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:17
 * @route '/logistics/kpis'
 */
kpis.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: kpis.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:17
 * @route '/logistics/kpis'
 */
    const kpisForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: kpis.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:17
 * @route '/logistics/kpis'
 */
        kpisForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: kpis.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::kpis
 * @see app/Http/Controllers/Api/LogisticsController.php:17
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
 * @see app/Http/Controllers/Api/LogisticsController.php:142
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
 * @see app/Http/Controllers/Api/LogisticsController.php:142
 * @route '/logistics/stock-kpis'
 */
stockKpis.url = (options?: RouteQueryOptions) => {
    return stockKpis.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:142
 * @route '/logistics/stock-kpis'
 */
stockKpis.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockKpis.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:142
 * @route '/logistics/stock-kpis'
 */
stockKpis.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: stockKpis.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:142
 * @route '/logistics/stock-kpis'
 */
    const stockKpisForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: stockKpis.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:142
 * @route '/logistics/stock-kpis'
 */
        stockKpisForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockKpis.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockKpis
 * @see app/Http/Controllers/Api/LogisticsController.php:142
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
 * @see app/Http/Controllers/Api/LogisticsController.php:208
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
 * @see app/Http/Controllers/Api/LogisticsController.php:208
 * @route '/logistics/stock-composition'
 */
stockComposition.url = (options?: RouteQueryOptions) => {
    return stockComposition.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:208
 * @route '/logistics/stock-composition'
 */
stockComposition.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockComposition.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:208
 * @route '/logistics/stock-composition'
 */
stockComposition.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: stockComposition.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:208
 * @route '/logistics/stock-composition'
 */
    const stockCompositionForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: stockComposition.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:208
 * @route '/logistics/stock-composition'
 */
        stockCompositionForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockComposition.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockComposition
 * @see app/Http/Controllers/Api/LogisticsController.php:208
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
 * @see app/Http/Controllers/Api/LogisticsController.php:257
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
 * @see app/Http/Controllers/Api/LogisticsController.php:257
 * @route '/logistics/ofs'
 */
ofs.url = (options?: RouteQueryOptions) => {
    return ofs.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:257
 * @route '/logistics/ofs'
 */
ofs.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: ofs.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:257
 * @route '/logistics/ofs'
 */
ofs.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: ofs.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:257
 * @route '/logistics/ofs'
 */
    const ofsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: ofs.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:257
 * @route '/logistics/ofs'
 */
        ofsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: ofs.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::ofs
 * @see app/Http/Controllers/Api/LogisticsController.php:257
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
* @see \App\Http\Controllers\Api\LogisticsController::livraison
 * @see app/Http/Controllers/Api/LogisticsController.php:339
 * @route '/logistics/livraison'
 */
export const livraison = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: livraison.url(options),
    method: 'get',
})

livraison.definition = {
    methods: ["get","head"],
    url: '/logistics/livraison',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\LogisticsController::livraison
 * @see app/Http/Controllers/Api/LogisticsController.php:339
 * @route '/logistics/livraison'
 */
livraison.url = (options?: RouteQueryOptions) => {
    return livraison.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::livraison
 * @see app/Http/Controllers/Api/LogisticsController.php:339
 * @route '/logistics/livraison'
 */
livraison.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: livraison.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::livraison
 * @see app/Http/Controllers/Api/LogisticsController.php:339
 * @route '/logistics/livraison'
 */
livraison.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: livraison.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::livraison
 * @see app/Http/Controllers/Api/LogisticsController.php:339
 * @route '/logistics/livraison'
 */
    const livraisonForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: livraison.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::livraison
 * @see app/Http/Controllers/Api/LogisticsController.php:339
 * @route '/logistics/livraison'
 */
        livraisonForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: livraison.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::livraison
 * @see app/Http/Controllers/Api/LogisticsController.php:339
 * @route '/logistics/livraison'
 */
        livraisonForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: livraison.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    livraison.form = livraisonForm
/**
* @see \App\Http\Controllers\Api\LogisticsController::coverage
 * @see app/Http/Controllers/Api/LogisticsController.php:374
 * @route '/logistics/coverage'
 */
export const coverage = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coverage.url(options),
    method: 'get',
})

coverage.definition = {
    methods: ["get","head"],
    url: '/logistics/coverage',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\LogisticsController::coverage
 * @see app/Http/Controllers/Api/LogisticsController.php:374
 * @route '/logistics/coverage'
 */
coverage.url = (options?: RouteQueryOptions) => {
    return coverage.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::coverage
 * @see app/Http/Controllers/Api/LogisticsController.php:374
 * @route '/logistics/coverage'
 */
coverage.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coverage.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::coverage
 * @see app/Http/Controllers/Api/LogisticsController.php:374
 * @route '/logistics/coverage'
 */
coverage.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: coverage.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::coverage
 * @see app/Http/Controllers/Api/LogisticsController.php:374
 * @route '/logistics/coverage'
 */
    const coverageForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: coverage.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::coverage
 * @see app/Http/Controllers/Api/LogisticsController.php:374
 * @route '/logistics/coverage'
 */
        coverageForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coverage.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::coverage
 * @see app/Http/Controllers/Api/LogisticsController.php:374
 * @route '/logistics/coverage'
 */
        coverageForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coverage.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    coverage.form = coverageForm
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockSearch
 * @see app/Http/Controllers/Api/LogisticsController.php:479
 * @route '/logistics/stock-search'
 */
export const stockSearch = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockSearch.url(options),
    method: 'get',
})

stockSearch.definition = {
    methods: ["get","head"],
    url: '/logistics/stock-search',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockSearch
 * @see app/Http/Controllers/Api/LogisticsController.php:479
 * @route '/logistics/stock-search'
 */
stockSearch.url = (options?: RouteQueryOptions) => {
    return stockSearch.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockSearch
 * @see app/Http/Controllers/Api/LogisticsController.php:479
 * @route '/logistics/stock-search'
 */
stockSearch.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockSearch.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockSearch
 * @see app/Http/Controllers/Api/LogisticsController.php:479
 * @route '/logistics/stock-search'
 */
stockSearch.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: stockSearch.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::stockSearch
 * @see app/Http/Controllers/Api/LogisticsController.php:479
 * @route '/logistics/stock-search'
 */
    const stockSearchForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: stockSearch.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockSearch
 * @see app/Http/Controllers/Api/LogisticsController.php:479
 * @route '/logistics/stock-search'
 */
        stockSearchForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockSearch.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockSearch
 * @see app/Http/Controllers/Api/LogisticsController.php:479
 * @route '/logistics/stock-search'
 */
        stockSearchForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockSearch.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    stockSearch.form = stockSearchForm
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:633
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
 * @see app/Http/Controllers/Api/LogisticsController.php:633
 * @route '/logistics/stock-reliability'
 */
stockReliability.url = (options?: RouteQueryOptions) => {
    return stockReliability.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:633
 * @route '/logistics/stock-reliability'
 */
stockReliability.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stockReliability.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:633
 * @route '/logistics/stock-reliability'
 */
stockReliability.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: stockReliability.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:633
 * @route '/logistics/stock-reliability'
 */
    const stockReliabilityForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: stockReliability.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:633
 * @route '/logistics/stock-reliability'
 */
        stockReliabilityForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stockReliability.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\LogisticsController::stockReliability
 * @see app/Http/Controllers/Api/LogisticsController.php:633
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
const LogisticsController = { kpis, stockKpis, stockComposition, ofs, livraison, coverage, stockSearch, stockReliability }

export default LogisticsController