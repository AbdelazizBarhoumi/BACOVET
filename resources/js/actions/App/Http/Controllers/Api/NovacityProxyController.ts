import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\NovacityProxyController::proxy
 * @see app/Http/Controllers/Api/NovacityProxyController.php:12
 * @route '/api/novacity/{path}'
 */
export const proxy = (args: { path: string | number } | [path: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: proxy.url(args, options),
    method: 'get',
})

proxy.definition = {
    methods: ["get","head"],
    url: '/api/novacity/{path}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\NovacityProxyController::proxy
 * @see app/Http/Controllers/Api/NovacityProxyController.php:12
 * @route '/api/novacity/{path}'
 */
proxy.url = (args: { path: string | number } | [path: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { path: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    path: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        path: args.path,
                }

    return proxy.definition.url
            .replace('{path}', parsedArgs.path.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityProxyController::proxy
 * @see app/Http/Controllers/Api/NovacityProxyController.php:12
 * @route '/api/novacity/{path}'
 */
proxy.get = (args: { path: string | number } | [path: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: proxy.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityProxyController::proxy
 * @see app/Http/Controllers/Api/NovacityProxyController.php:12
 * @route '/api/novacity/{path}'
 */
proxy.head = (args: { path: string | number } | [path: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: proxy.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityProxyController::proxy
 * @see app/Http/Controllers/Api/NovacityProxyController.php:12
 * @route '/api/novacity/{path}'
 */
    const proxyForm = (args: { path: string | number } | [path: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: proxy.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityProxyController::proxy
 * @see app/Http/Controllers/Api/NovacityProxyController.php:12
 * @route '/api/novacity/{path}'
 */
        proxyForm.get = (args: { path: string | number } | [path: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: proxy.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityProxyController::proxy
 * @see app/Http/Controllers/Api/NovacityProxyController.php:12
 * @route '/api/novacity/{path}'
 */
        proxyForm.head = (args: { path: string | number } | [path: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: proxy.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    proxy.form = proxyForm
const NovacityProxyController = { proxy }

export default NovacityProxyController