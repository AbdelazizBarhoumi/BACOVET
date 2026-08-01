import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:16
 * @route '/api/v5/endpoint-datasets'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/v5/endpoint-datasets',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:16
 * @route '/api/v5/endpoint-datasets'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:16
 * @route '/api/v5/endpoint-datasets'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:16
 * @route '/api/v5/endpoint-datasets'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:16
 * @route '/api/v5/endpoint-datasets'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:16
 * @route '/api/v5/endpoint-datasets'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:16
 * @route '/api/v5/endpoint-datasets'
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
const EndpointDatasetV5Controller = { index }

export default EndpointDatasetV5Controller