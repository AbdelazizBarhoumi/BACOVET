import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::index
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:13
 * @route '/api/v5/measures'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/v5/measures',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::index
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:13
 * @route '/api/v5/measures'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::index
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:13
 * @route '/api/v5/measures'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::index
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:13
 * @route '/api/v5/measures'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\MeasureV5Controller::index
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:13
 * @route '/api/v5/measures'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\MeasureV5Controller::index
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:13
 * @route '/api/v5/measures'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\MeasureV5Controller::index
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:13
 * @route '/api/v5/measures'
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
* @see \App\Http\Controllers\Api\MeasureV5Controller::store
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:23
 * @route '/api/v5/measures'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/v5/measures',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::store
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:23
 * @route '/api/v5/measures'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::store
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:23
 * @route '/api/v5/measures'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\MeasureV5Controller::store
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:23
 * @route '/api/v5/measures'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\MeasureV5Controller::store
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:23
 * @route '/api/v5/measures'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::update
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:49
 * @route '/api/v5/measures/{id}'
 */
export const update = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

update.definition = {
    methods: ["put"],
    url: '/api/v5/measures/{id}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::update
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:49
 * @route '/api/v5/measures/{id}'
 */
update.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return update.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::update
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:49
 * @route '/api/v5/measures/{id}'
 */
update.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\MeasureV5Controller::update
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:49
 * @route '/api/v5/measures/{id}'
 */
    const updateForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: update.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\MeasureV5Controller::update
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:49
 * @route '/api/v5/measures/{id}'
 */
        updateForm.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: update.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    update.form = updateForm
/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::destroy
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:81
 * @route '/api/v5/measures/{id}'
 */
export const destroy = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/api/v5/measures/{id}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\MeasureV5Controller::destroy
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:81
 * @route '/api/v5/measures/{id}'
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
* @see \App\Http\Controllers\Api\MeasureV5Controller::destroy
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:81
 * @route '/api/v5/measures/{id}'
 */
destroy.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\MeasureV5Controller::destroy
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:81
 * @route '/api/v5/measures/{id}'
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
* @see \App\Http\Controllers\Api\MeasureV5Controller::destroy
 * @see app/Http/Controllers/Api/MeasureV5Controller.php:81
 * @route '/api/v5/measures/{id}'
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
const MeasureV5Controller = { index, store, update, destroy }

export default MeasureV5Controller