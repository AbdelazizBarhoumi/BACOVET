import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:14
 * @route '/novacity-endpoints'
 */
const NovacityEndpointsController = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: NovacityEndpointsController.url(options),
    method: 'get',
})

NovacityEndpointsController.definition = {
    methods: ["get","head"],
    url: '/novacity-endpoints',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:14
 * @route '/novacity-endpoints'
 */
NovacityEndpointsController.url = (options?: RouteQueryOptions) => {
    return NovacityEndpointsController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:14
 * @route '/novacity-endpoints'
 */
NovacityEndpointsController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: NovacityEndpointsController.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:14
 * @route '/novacity-endpoints'
 */
NovacityEndpointsController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: NovacityEndpointsController.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:14
 * @route '/novacity-endpoints'
 */
    const NovacityEndpointsControllerForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: NovacityEndpointsController.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:14
 * @route '/novacity-endpoints'
 */
        NovacityEndpointsControllerForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: NovacityEndpointsController.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:14
 * @route '/novacity-endpoints'
 */
        NovacityEndpointsControllerForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: NovacityEndpointsController.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    NovacityEndpointsController.form = NovacityEndpointsControllerForm
export default NovacityEndpointsController