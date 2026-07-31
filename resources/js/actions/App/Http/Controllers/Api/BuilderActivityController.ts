import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\BuilderActivityController::store
 * @see app/Http/Controllers/Api/BuilderActivityController.php:17
 * @route '/api/builder-activity'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/builder-activity',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\BuilderActivityController::store
 * @see app/Http/Controllers/Api/BuilderActivityController.php:17
 * @route '/api/builder-activity'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderActivityController::store
 * @see app/Http/Controllers/Api/BuilderActivityController.php:17
 * @route '/api/builder-activity'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\BuilderActivityController::store
 * @see app/Http/Controllers/Api/BuilderActivityController.php:17
 * @route '/api/builder-activity'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderActivityController::store
 * @see app/Http/Controllers/Api/BuilderActivityController.php:17
 * @route '/api/builder-activity'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
/**
* @see \App\Http\Controllers\Api\BuilderActivityController::index
 * @see app/Http/Controllers/Api/BuilderActivityController.php:53
 * @route '/api/builder-activity'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/builder-activity',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\BuilderActivityController::index
 * @see app/Http/Controllers/Api/BuilderActivityController.php:53
 * @route '/api/builder-activity'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderActivityController::index
 * @see app/Http/Controllers/Api/BuilderActivityController.php:53
 * @route '/api/builder-activity'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\BuilderActivityController::index
 * @see app/Http/Controllers/Api/BuilderActivityController.php:53
 * @route '/api/builder-activity'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\BuilderActivityController::index
 * @see app/Http/Controllers/Api/BuilderActivityController.php:53
 * @route '/api/builder-activity'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderActivityController::index
 * @see app/Http/Controllers/Api/BuilderActivityController.php:53
 * @route '/api/builder-activity'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\BuilderActivityController::index
 * @see app/Http/Controllers/Api/BuilderActivityController.php:53
 * @route '/api/builder-activity'
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
const BuilderActivityController = { store, index }

export default BuilderActivityController