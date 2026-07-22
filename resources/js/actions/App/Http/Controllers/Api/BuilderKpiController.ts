import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\BuilderKpiController::index
 * @see app/Http/Controllers/Api/BuilderKpiController.php:12
 * @route '/api/builder-kpis'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/builder-kpis',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\BuilderKpiController::index
 * @see app/Http/Controllers/Api/BuilderKpiController.php:12
 * @route '/api/builder-kpis'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderKpiController::index
 * @see app/Http/Controllers/Api/BuilderKpiController.php:12
 * @route '/api/builder-kpis'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\BuilderKpiController::index
 * @see app/Http/Controllers/Api/BuilderKpiController.php:12
 * @route '/api/builder-kpis'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\BuilderKpiController::index
 * @see app/Http/Controllers/Api/BuilderKpiController.php:12
 * @route '/api/builder-kpis'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderKpiController::index
 * @see app/Http/Controllers/Api/BuilderKpiController.php:12
 * @route '/api/builder-kpis'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\BuilderKpiController::index
 * @see app/Http/Controllers/Api/BuilderKpiController.php:12
 * @route '/api/builder-kpis'
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
* @see \App\Http\Controllers\Api\BuilderKpiController::data
 * @see app/Http/Controllers/Api/BuilderKpiController.php:39
 * @route '/api/builder-kpis/data'
 */
export const data = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: data.url(options),
    method: 'get',
})

data.definition = {
    methods: ["get","head"],
    url: '/api/builder-kpis/data',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\BuilderKpiController::data
 * @see app/Http/Controllers/Api/BuilderKpiController.php:39
 * @route '/api/builder-kpis/data'
 */
data.url = (options?: RouteQueryOptions) => {
    return data.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderKpiController::data
 * @see app/Http/Controllers/Api/BuilderKpiController.php:39
 * @route '/api/builder-kpis/data'
 */
data.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: data.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\BuilderKpiController::data
 * @see app/Http/Controllers/Api/BuilderKpiController.php:39
 * @route '/api/builder-kpis/data'
 */
data.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: data.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\BuilderKpiController::data
 * @see app/Http/Controllers/Api/BuilderKpiController.php:39
 * @route '/api/builder-kpis/data'
 */
    const dataForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: data.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderKpiController::data
 * @see app/Http/Controllers/Api/BuilderKpiController.php:39
 * @route '/api/builder-kpis/data'
 */
        dataForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: data.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\BuilderKpiController::data
 * @see app/Http/Controllers/Api/BuilderKpiController.php:39
 * @route '/api/builder-kpis/data'
 */
        dataForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: data.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    data.form = dataForm
const BuilderKpiController = { index, data }

export default BuilderKpiController