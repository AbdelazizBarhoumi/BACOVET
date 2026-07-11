import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\HealthController::check
 * @see app/Http/Controllers/Api/HealthController.php:13
 * @route '/health'
 */
export const check = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: check.url(options),
    method: 'get',
})

check.definition = {
    methods: ["get","head"],
    url: '/health',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\HealthController::check
 * @see app/Http/Controllers/Api/HealthController.php:13
 * @route '/health'
 */
check.url = (options?: RouteQueryOptions) => {
    return check.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\HealthController::check
 * @see app/Http/Controllers/Api/HealthController.php:13
 * @route '/health'
 */
check.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: check.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\HealthController::check
 * @see app/Http/Controllers/Api/HealthController.php:13
 * @route '/health'
 */
check.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: check.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\HealthController::check
 * @see app/Http/Controllers/Api/HealthController.php:13
 * @route '/health'
 */
    const checkForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: check.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\HealthController::check
 * @see app/Http/Controllers/Api/HealthController.php:13
 * @route '/health'
 */
        checkForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: check.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\HealthController::check
 * @see app/Http/Controllers/Api/HealthController.php:13
 * @route '/health'
 */
        checkForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: check.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    check.form = checkForm
const HealthController = { check }

export default HealthController