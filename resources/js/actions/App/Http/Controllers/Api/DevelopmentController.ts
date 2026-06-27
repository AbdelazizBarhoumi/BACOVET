import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:13
 * @route '/developpement/kpis'
 */
export const kpis = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})

kpis.definition = {
    methods: ["get","head"],
    url: '/developpement/kpis',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:13
 * @route '/developpement/kpis'
 */
kpis.url = (options?: RouteQueryOptions) => {
    return kpis.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:13
 * @route '/developpement/kpis'
 */
kpis.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:13
 * @route '/developpement/kpis'
 */
kpis.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: kpis.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:13
 * @route '/developpement/kpis'
 */
    const kpisForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: kpis.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:13
 * @route '/developpement/kpis'
 */
        kpisForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: kpis.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DevelopmentController::kpis
 * @see app/Http/Controllers/Api/DevelopmentController.php:13
 * @route '/developpement/kpis'
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
 * @see app/Http/Controllers/Api/DevelopmentController.php:112
 * @route '/developpement/trend'
 */
export const trend = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: trend.url(options),
    method: 'get',
})

trend.definition = {
    methods: ["get","head"],
    url: '/developpement/trend',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:112
 * @route '/developpement/trend'
 */
trend.url = (options?: RouteQueryOptions) => {
    return trend.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:112
 * @route '/developpement/trend'
 */
trend.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: trend.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:112
 * @route '/developpement/trend'
 */
trend.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: trend.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:112
 * @route '/developpement/trend'
 */
    const trendForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: trend.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:112
 * @route '/developpement/trend'
 */
        trendForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: trend.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DevelopmentController::trend
 * @see app/Http/Controllers/Api/DevelopmentController.php:112
 * @route '/developpement/trend'
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
* @see \App\Http\Controllers\Api\DevelopmentController::reclamationsScatter
 * @see app/Http/Controllers/Api/DevelopmentController.php:153
 * @route '/developpement/reclamations-scatter'
 */
export const reclamationsScatter = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: reclamationsScatter.url(options),
    method: 'get',
})

reclamationsScatter.definition = {
    methods: ["get","head"],
    url: '/developpement/reclamations-scatter',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DevelopmentController::reclamationsScatter
 * @see app/Http/Controllers/Api/DevelopmentController.php:153
 * @route '/developpement/reclamations-scatter'
 */
reclamationsScatter.url = (options?: RouteQueryOptions) => {
    return reclamationsScatter.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DevelopmentController::reclamationsScatter
 * @see app/Http/Controllers/Api/DevelopmentController.php:153
 * @route '/developpement/reclamations-scatter'
 */
reclamationsScatter.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: reclamationsScatter.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DevelopmentController::reclamationsScatter
 * @see app/Http/Controllers/Api/DevelopmentController.php:153
 * @route '/developpement/reclamations-scatter'
 */
reclamationsScatter.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: reclamationsScatter.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DevelopmentController::reclamationsScatter
 * @see app/Http/Controllers/Api/DevelopmentController.php:153
 * @route '/developpement/reclamations-scatter'
 */
    const reclamationsScatterForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: reclamationsScatter.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DevelopmentController::reclamationsScatter
 * @see app/Http/Controllers/Api/DevelopmentController.php:153
 * @route '/developpement/reclamations-scatter'
 */
        reclamationsScatterForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: reclamationsScatter.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DevelopmentController::reclamationsScatter
 * @see app/Http/Controllers/Api/DevelopmentController.php:153
 * @route '/developpement/reclamations-scatter'
 */
        reclamationsScatterForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: reclamationsScatter.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    reclamationsScatter.form = reclamationsScatterForm
const DevelopmentController = { kpis, trend, reclamationsScatter }

export default DevelopmentController