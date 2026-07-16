import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\KpiEndpointController::index
 * @see app/Http/Controllers/Api/KpiEndpointController.php:17
 * @route '/admin/kpi-endpoints'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/admin/kpi-endpoints',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\KpiEndpointController::index
 * @see app/Http/Controllers/Api/KpiEndpointController.php:17
 * @route '/admin/kpi-endpoints'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KpiEndpointController::index
 * @see app/Http/Controllers/Api/KpiEndpointController.php:17
 * @route '/admin/kpi-endpoints'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\KpiEndpointController::index
 * @see app/Http/Controllers/Api/KpiEndpointController.php:17
 * @route '/admin/kpi-endpoints'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\KpiEndpointController::index
 * @see app/Http/Controllers/Api/KpiEndpointController.php:17
 * @route '/admin/kpi-endpoints'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\KpiEndpointController::index
 * @see app/Http/Controllers/Api/KpiEndpointController.php:17
 * @route '/admin/kpi-endpoints'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\KpiEndpointController::index
 * @see app/Http/Controllers/Api/KpiEndpointController.php:17
 * @route '/admin/kpi-endpoints'
 */
        indexForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    index.form = indexForm
/**
* @see \App\Http\Controllers\Api\KpiEndpointController::show
 * @see app/Http/Controllers/Api/KpiEndpointController.php:94
 * @route '/admin/kpi-endpoints/{kpiCode}'
 */
export const show = (args: { kpiCode: string | number } | [kpiCode: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/admin/kpi-endpoints/{kpiCode}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\KpiEndpointController::show
 * @see app/Http/Controllers/Api/KpiEndpointController.php:94
 * @route '/admin/kpi-endpoints/{kpiCode}'
 */
show.url = (args: { kpiCode: string | number } | [kpiCode: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { kpiCode: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    kpiCode: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        kpiCode: args.kpiCode,
                }

    return show.definition.url
            .replace('{kpiCode}', parsedArgs.kpiCode.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KpiEndpointController::show
 * @see app/Http/Controllers/Api/KpiEndpointController.php:94
 * @route '/admin/kpi-endpoints/{kpiCode}'
 */
show.get = (args: { kpiCode: string | number } | [kpiCode: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\KpiEndpointController::show
 * @see app/Http/Controllers/Api/KpiEndpointController.php:94
 * @route '/admin/kpi-endpoints/{kpiCode}'
 */
show.head = (args: { kpiCode: string | number } | [kpiCode: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\KpiEndpointController::show
 * @see app/Http/Controllers/Api/KpiEndpointController.php:94
 * @route '/admin/kpi-endpoints/{kpiCode}'
 */
    const showForm = (args: { kpiCode: string | number } | [kpiCode: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: show.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\KpiEndpointController::show
 * @see app/Http/Controllers/Api/KpiEndpointController.php:94
 * @route '/admin/kpi-endpoints/{kpiCode}'
 */
        showForm.get = (args: { kpiCode: string | number } | [kpiCode: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: show.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\KpiEndpointController::show
 * @see app/Http/Controllers/Api/KpiEndpointController.php:94
 * @route '/admin/kpi-endpoints/{kpiCode}'
 */
        showForm.head = (args: { kpiCode: string | number } | [kpiCode: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: show.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    show.form = showForm
/**
* @see \App\Http\Controllers\Api\KpiEndpointController::fire
 * @see app/Http/Controllers/Api/KpiEndpointController.php:105
 * @route '/admin/kpi-endpoints/fire'
 */
export const fire = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: fire.url(options),
    method: 'post',
})

fire.definition = {
    methods: ["post"],
    url: '/admin/kpi-endpoints/fire',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\KpiEndpointController::fire
 * @see app/Http/Controllers/Api/KpiEndpointController.php:105
 * @route '/admin/kpi-endpoints/fire'
 */
fire.url = (options?: RouteQueryOptions) => {
    return fire.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KpiEndpointController::fire
 * @see app/Http/Controllers/Api/KpiEndpointController.php:105
 * @route '/admin/kpi-endpoints/fire'
 */
fire.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: fire.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\KpiEndpointController::fire
 * @see app/Http/Controllers/Api/KpiEndpointController.php:105
 * @route '/admin/kpi-endpoints/fire'
 */
    const fireForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: fire.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KpiEndpointController::fire
 * @see app/Http/Controllers/Api/KpiEndpointController.php:105
 * @route '/admin/kpi-endpoints/fire'
 */
        fireForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: fire.url(options),
            method: 'post',
        })
    
    fire.form = fireForm
/**
* @see \App\Http\Controllers\Api\KpiEndpointController::fireAll
 * @see app/Http/Controllers/Api/KpiEndpointController.php:155
 * @route '/admin/kpi-endpoints/fire-all'
 */
export const fireAll = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: fireAll.url(options),
    method: 'post',
})

fireAll.definition = {
    methods: ["post"],
    url: '/admin/kpi-endpoints/fire-all',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\KpiEndpointController::fireAll
 * @see app/Http/Controllers/Api/KpiEndpointController.php:155
 * @route '/admin/kpi-endpoints/fire-all'
 */
fireAll.url = (options?: RouteQueryOptions) => {
    return fireAll.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KpiEndpointController::fireAll
 * @see app/Http/Controllers/Api/KpiEndpointController.php:155
 * @route '/admin/kpi-endpoints/fire-all'
 */
fireAll.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: fireAll.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\KpiEndpointController::fireAll
 * @see app/Http/Controllers/Api/KpiEndpointController.php:155
 * @route '/admin/kpi-endpoints/fire-all'
 */
    const fireAllForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: fireAll.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KpiEndpointController::fireAll
 * @see app/Http/Controllers/Api/KpiEndpointController.php:155
 * @route '/admin/kpi-endpoints/fire-all'
 */
        fireAllForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: fireAll.url(options),
            method: 'post',
        })
    
    fireAll.form = fireAllForm
const KpiEndpointController = { index, show, fire, fireAll }

export default KpiEndpointController