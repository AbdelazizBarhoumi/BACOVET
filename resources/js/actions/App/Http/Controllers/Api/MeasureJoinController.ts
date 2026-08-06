import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\MeasureJoinController::index
 * @see app/Http/Controllers/Api/MeasureJoinController.php:13
 * @route '/api/v5/joins'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/v5/joins',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\MeasureJoinController::index
 * @see app/Http/Controllers/Api/MeasureJoinController.php:13
 * @route '/api/v5/joins'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MeasureJoinController::index
 * @see app/Http/Controllers/Api/MeasureJoinController.php:13
 * @route '/api/v5/joins'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\MeasureJoinController::index
 * @see app/Http/Controllers/Api/MeasureJoinController.php:13
 * @route '/api/v5/joins'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\MeasureJoinController::index
 * @see app/Http/Controllers/Api/MeasureJoinController.php:13
 * @route '/api/v5/joins'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\MeasureJoinController::index
 * @see app/Http/Controllers/Api/MeasureJoinController.php:13
 * @route '/api/v5/joins'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\MeasureJoinController::index
 * @see app/Http/Controllers/Api/MeasureJoinController.php:13
 * @route '/api/v5/joins'
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
* @see \App\Http\Controllers\Api\MeasureJoinController::store
 * @see app/Http/Controllers/Api/MeasureJoinController.php:23
 * @route '/api/v5/joins'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/v5/joins',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\MeasureJoinController::store
 * @see app/Http/Controllers/Api/MeasureJoinController.php:23
 * @route '/api/v5/joins'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MeasureJoinController::store
 * @see app/Http/Controllers/Api/MeasureJoinController.php:23
 * @route '/api/v5/joins'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\MeasureJoinController::store
 * @see app/Http/Controllers/Api/MeasureJoinController.php:23
 * @route '/api/v5/joins'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\MeasureJoinController::store
 * @see app/Http/Controllers/Api/MeasureJoinController.php:23
 * @route '/api/v5/joins'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
/**
* @see \App\Http\Controllers\Api\MeasureJoinController::destroy
 * @see app/Http/Controllers/Api/MeasureJoinController.php:51
 * @route '/api/v5/joins/{id}'
 */
export const destroy = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/api/v5/joins/{id}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\MeasureJoinController::destroy
 * @see app/Http/Controllers/Api/MeasureJoinController.php:51
 * @route '/api/v5/joins/{id}'
 */
destroy.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { id: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    id: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        id: args.id,
                }

    return destroy.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MeasureJoinController::destroy
 * @see app/Http/Controllers/Api/MeasureJoinController.php:51
 * @route '/api/v5/joins/{id}'
 */
destroy.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\MeasureJoinController::destroy
 * @see app/Http/Controllers/Api/MeasureJoinController.php:51
 * @route '/api/v5/joins/{id}'
 */
    const destroyForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: destroy.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'DELETE',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\MeasureJoinController::destroy
 * @see app/Http/Controllers/Api/MeasureJoinController.php:51
 * @route '/api/v5/joins/{id}'
 */
        destroyForm.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: destroy.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'DELETE',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    destroy.form = destroyForm
const MeasureJoinController = { index, store, destroy }

export default MeasureJoinController