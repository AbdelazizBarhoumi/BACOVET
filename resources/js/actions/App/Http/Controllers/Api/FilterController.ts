import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\FilterController::options
 * @see app/Http/Controllers/Api/FilterController.php:11
 * @route '/filters/options'
 */
export const options = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: options.url(options),
    method: 'get',
})

options.definition = {
    methods: ["get","head"],
    url: '/filters/options',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\FilterController::options
 * @see app/Http/Controllers/Api/FilterController.php:11
 * @route '/filters/options'
 */
options.url = (options?: RouteQueryOptions) => {
    return options.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\FilterController::options
 * @see app/Http/Controllers/Api/FilterController.php:11
 * @route '/filters/options'
 */
options.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: options.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\FilterController::options
 * @see app/Http/Controllers/Api/FilterController.php:11
 * @route '/filters/options'
 */
options.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: options.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\FilterController::options
 * @see app/Http/Controllers/Api/FilterController.php:11
 * @route '/filters/options'
 */
    const optionsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: options.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\FilterController::options
 * @see app/Http/Controllers/Api/FilterController.php:11
 * @route '/filters/options'
 */
        optionsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: options.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\FilterController::options
 * @see app/Http/Controllers/Api/FilterController.php:11
 * @route '/filters/options'
 */
        optionsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: options.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    options.form = optionsForm
const FilterController = { options }

export default FilterController