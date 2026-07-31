import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::index
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:14
 * @route '/api/v4/builder-page-groups'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/v4/builder-page-groups',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::index
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:14
 * @route '/api/v4/builder-page-groups'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::index
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:14
 * @route '/api/v4/builder-page-groups'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::index
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:14
 * @route '/api/v4/builder-page-groups'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::index
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:14
 * @route '/api/v4/builder-page-groups'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::index
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:14
 * @route '/api/v4/builder-page-groups'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::index
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:14
 * @route '/api/v4/builder-page-groups'
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
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::store
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:32
 * @route '/api/v4/builder-page-groups'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/v4/builder-page-groups',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::store
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:32
 * @route '/api/v4/builder-page-groups'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::store
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:32
 * @route '/api/v4/builder-page-groups'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::store
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:32
 * @route '/api/v4/builder-page-groups'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::store
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:32
 * @route '/api/v4/builder-page-groups'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::assignPage
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:97
 * @route '/api/v4/builder-page-groups/assign-page'
 */
export const assignPage = (options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: assignPage.url(options),
    method: 'put',
})

assignPage.definition = {
    methods: ["put"],
    url: '/api/v4/builder-page-groups/assign-page',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::assignPage
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:97
 * @route '/api/v4/builder-page-groups/assign-page'
 */
assignPage.url = (options?: RouteQueryOptions) => {
    return assignPage.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::assignPage
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:97
 * @route '/api/v4/builder-page-groups/assign-page'
 */
assignPage.put = (options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: assignPage.url(options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::assignPage
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:97
 * @route '/api/v4/builder-page-groups/assign-page'
 */
    const assignPageForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: assignPage.url({
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::assignPage
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:97
 * @route '/api/v4/builder-page-groups/assign-page'
 */
        assignPageForm.put = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: assignPage.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    assignPage.form = assignPageForm
/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::reorderPages
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:116
 * @route '/api/v4/builder-page-groups/reorder-pages'
 */
export const reorderPages = (options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: reorderPages.url(options),
    method: 'put',
})

reorderPages.definition = {
    methods: ["put"],
    url: '/api/v4/builder-page-groups/reorder-pages',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::reorderPages
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:116
 * @route '/api/v4/builder-page-groups/reorder-pages'
 */
reorderPages.url = (options?: RouteQueryOptions) => {
    return reorderPages.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::reorderPages
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:116
 * @route '/api/v4/builder-page-groups/reorder-pages'
 */
reorderPages.put = (options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: reorderPages.url(options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::reorderPages
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:116
 * @route '/api/v4/builder-page-groups/reorder-pages'
 */
    const reorderPagesForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: reorderPages.url({
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::reorderPages
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:116
 * @route '/api/v4/builder-page-groups/reorder-pages'
 */
        reorderPagesForm.put = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: reorderPages.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    reorderPages.form = reorderPagesForm
/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::reorderGroups
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:131
 * @route '/api/v4/builder-page-groups/reorder-groups'
 */
export const reorderGroups = (options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: reorderGroups.url(options),
    method: 'put',
})

reorderGroups.definition = {
    methods: ["put"],
    url: '/api/v4/builder-page-groups/reorder-groups',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::reorderGroups
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:131
 * @route '/api/v4/builder-page-groups/reorder-groups'
 */
reorderGroups.url = (options?: RouteQueryOptions) => {
    return reorderGroups.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::reorderGroups
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:131
 * @route '/api/v4/builder-page-groups/reorder-groups'
 */
reorderGroups.put = (options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: reorderGroups.url(options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::reorderGroups
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:131
 * @route '/api/v4/builder-page-groups/reorder-groups'
 */
    const reorderGroupsForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: reorderGroups.url({
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::reorderGroups
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:131
 * @route '/api/v4/builder-page-groups/reorder-groups'
 */
        reorderGroupsForm.put = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: reorderGroups.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    reorderGroups.form = reorderGroupsForm
/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::update
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:55
 * @route '/api/v4/builder-page-groups/{id}'
 */
export const update = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

update.definition = {
    methods: ["put"],
    url: '/api/v4/builder-page-groups/{id}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::update
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:55
 * @route '/api/v4/builder-page-groups/{id}'
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
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::update
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:55
 * @route '/api/v4/builder-page-groups/{id}'
 */
update.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::update
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:55
 * @route '/api/v4/builder-page-groups/{id}'
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
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::update
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:55
 * @route '/api/v4/builder-page-groups/{id}'
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
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::destroy
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:83
 * @route '/api/v4/builder-page-groups/{id}'
 */
export const destroy = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/api/v4/builder-page-groups/{id}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::destroy
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:83
 * @route '/api/v4/builder-page-groups/{id}'
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
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::destroy
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:83
 * @route '/api/v4/builder-page-groups/{id}'
 */
destroy.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::destroy
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:83
 * @route '/api/v4/builder-page-groups/{id}'
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
* @see \App\Http\Controllers\Api\BuilderPageGroupV4Controller::destroy
 * @see app/Http/Controllers/Api/BuilderPageGroupV4Controller.php:83
 * @route '/api/v4/builder-page-groups/{id}'
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
const BuilderPageGroupV4Controller = { index, store, assignPage, reorderPages, reorderGroups, update, destroy }

export default BuilderPageGroupV4Controller