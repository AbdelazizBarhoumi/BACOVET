import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:14
 * @route '/development/kpis'
 */
export const kpis = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})

kpis.definition = {
    methods: ["get","head"],
    url: '/development/kpis',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:14
 * @route '/development/kpis'
 */
kpis.url = (options?: RouteQueryOptions) => {
    return kpis.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:14
 * @route '/development/kpis'
 */
kpis.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:14
 * @route '/development/kpis'
 */
kpis.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: kpis.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:14
 * @route '/development/kpis'
 */
    const kpisForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: kpis.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:14
 * @route '/development/kpis'
 */
        kpisForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: kpis.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:14
 * @route '/development/kpis'
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
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:109
 * @route '/development/trend'
 */
export const trend = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: trend.url(options),
    method: 'get',
})

trend.definition = {
    methods: ["get","head"],
    url: '/development/trend',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:109
 * @route '/development/trend'
 */
trend.url = (options?: RouteQueryOptions) => {
    return trend.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:109
 * @route '/development/trend'
 */
trend.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: trend.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:109
 * @route '/development/trend'
 */
trend.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: trend.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:109
 * @route '/development/trend'
 */
    const trendForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: trend.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:109
 * @route '/development/trend'
 */
        trendForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: trend.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:109
 * @route '/development/trend'
 */
        trendForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: trend.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    trend.form = trendForm
/**
* @see \App\Http\Controllers\Api\DevelopmentController::leadTimeDev
 * @see app/Http/Controllers/Api/DevelopmentController.php:156
 * @route '/development/lead-time'
 */
export const leadTimeDev = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: leadTimeDev.url(options),
    method: 'get',
})

leadTimeDev.definition = {
    methods: ["get","head"],
    url: '/development/lead-time',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DevelopmentController::leadTimeDev
 * @see app/Http/Controllers/Api/DevelopmentController.php:156
 * @route '/development/lead-time'
 */
leadTimeDev.url = (options?: RouteQueryOptions) => {
    return leadTimeDev.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DevelopmentController::leadTimeDev
 * @see app/Http/Controllers/Api/DevelopmentController.php:156
 * @route '/development/lead-time'
 */
leadTimeDev.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: leadTimeDev.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DevelopmentController::leadTimeDev
 * @see app/Http/Controllers/Api/DevelopmentController.php:156
 * @route '/development/lead-time'
 */
leadTimeDev.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: leadTimeDev.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DevelopmentController::leadTimeDev
 * @see app/Http/Controllers/Api/DevelopmentController.php:156
 * @route '/development/lead-time'
 */
    const leadTimeDevForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: leadTimeDev.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DevelopmentController::leadTimeDev
 * @see app/Http/Controllers/Api/DevelopmentController.php:156
 * @route '/development/lead-time'
 */
        leadTimeDevForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: leadTimeDev.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DevelopmentController::leadTimeDev
 * @see app/Http/Controllers/Api/DevelopmentController.php:156
 * @route '/development/lead-time'
 */
        leadTimeDevForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: leadTimeDev.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    leadTimeDev.form = leadTimeDevForm
/**
* @see \App\Http\Controllers\Api\DevelopmentController::trendRft
 * @see app/Http/Controllers/Api/DevelopmentController.php:188
 * @route '/development/trend-rft'
 */
export const trendRft = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: trendRft.url(options),
    method: 'get',
})

trendRft.definition = {
    methods: ["get","head"],
    url: '/development/trend-rft',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DevelopmentController::trendRft
 * @see app/Http/Controllers/Api/DevelopmentController.php:188
 * @route '/development/trend-rft'
 */
trendRft.url = (options?: RouteQueryOptions) => {
    return trendRft.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DevelopmentController::trendRft
 * @see app/Http/Controllers/Api/DevelopmentController.php:188
 * @route '/development/trend-rft'
 */
trendRft.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: trendRft.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DevelopmentController::trendRft
 * @see app/Http/Controllers/Api/DevelopmentController.php:188
 * @route '/development/trend-rft'
 */
trendRft.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: trendRft.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DevelopmentController::trendRft
 * @see app/Http/Controllers/Api/DevelopmentController.php:188
 * @route '/development/trend-rft'
 */
    const trendRftForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: trendRft.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DevelopmentController::trendRft
 * @see app/Http/Controllers/Api/DevelopmentController.php:188
 * @route '/development/trend-rft'
 */
        trendRftForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: trendRft.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DevelopmentController::trendRft
 * @see app/Http/Controllers/Api/DevelopmentController.php:188
 * @route '/development/trend-rft'
 */
        trendRftForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: trendRft.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    trendRft.form = trendRftForm
/**
* @see \App\Http\Controllers\Api\DevelopmentController::trendLivraison
 * @see app/Http/Controllers/Api/DevelopmentController.php:207
 * @route '/development/trend-livraison'
 */
export const trendLivraison = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: trendLivraison.url(options),
    method: 'get',
})

trendLivraison.definition = {
    methods: ["get","head"],
    url: '/development/trend-livraison',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DevelopmentController::trendLivraison
 * @see app/Http/Controllers/Api/DevelopmentController.php:207
 * @route '/development/trend-livraison'
 */
trendLivraison.url = (options?: RouteQueryOptions) => {
    return trendLivraison.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DevelopmentController::trendLivraison
 * @see app/Http/Controllers/Api/DevelopmentController.php:207
 * @route '/development/trend-livraison'
 */
trendLivraison.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: trendLivraison.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DevelopmentController::trendLivraison
 * @see app/Http/Controllers/Api/DevelopmentController.php:207
 * @route '/development/trend-livraison'
 */
trendLivraison.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: trendLivraison.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DevelopmentController::trendLivraison
 * @see app/Http/Controllers/Api/DevelopmentController.php:207
 * @route '/development/trend-livraison'
 */
    const trendLivraisonForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: trendLivraison.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DevelopmentController::trendLivraison
 * @see app/Http/Controllers/Api/DevelopmentController.php:207
 * @route '/development/trend-livraison'
 */
        trendLivraisonForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: trendLivraison.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DevelopmentController::trendLivraison
 * @see app/Http/Controllers/Api/DevelopmentController.php:207
 * @route '/development/trend-livraison'
 */
        trendLivraisonForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: trendLivraison.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    trendLivraison.form = trendLivraisonForm
const DevelopmentController = { kpis, trend, leadTimeDev, trendRft, trendLivraison }

export default DevelopmentController