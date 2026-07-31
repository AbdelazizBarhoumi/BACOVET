import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::store
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:16
 * @route '/api/v5-activity'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/v5-activity',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::store
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:16
 * @route '/api/v5-activity'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::store
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:16
 * @route '/api/v5-activity'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::store
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:16
 * @route '/api/v5-activity'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::store
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:16
 * @route '/api/v5-activity'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
/**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::index
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:52
 * @route '/api/v5-activity'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/v5-activity',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::index
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:52
 * @route '/api/v5-activity'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::index
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:52
 * @route '/api/v5-activity'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::index
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:52
 * @route '/api/v5-activity'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::index
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:52
 * @route '/api/v5-activity'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::index
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:52
 * @route '/api/v5-activity'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\BuilderActivityV5Controller::index
 * @see app/Http/Controllers/Api/BuilderActivityV5Controller.php:52
 * @route '/api/v5-activity'
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
const BuilderActivityV5Controller = { store, index }

export default BuilderActivityV5Controller