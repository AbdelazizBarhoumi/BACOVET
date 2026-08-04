import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\KanbanController::index
 * @see app/Http/Controllers/Api/KanbanController.php:17
 * @route '/api/kanban/boards'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/kanban/boards',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::index
 * @see app/Http/Controllers/Api/KanbanController.php:17
 * @route '/api/kanban/boards'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::index
 * @see app/Http/Controllers/Api/KanbanController.php:17
 * @route '/api/kanban/boards'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\KanbanController::index
 * @see app/Http/Controllers/Api/KanbanController.php:17
 * @route '/api/kanban/boards'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::index
 * @see app/Http/Controllers/Api/KanbanController.php:17
 * @route '/api/kanban/boards'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::index
 * @see app/Http/Controllers/Api/KanbanController.php:17
 * @route '/api/kanban/boards'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\KanbanController::index
 * @see app/Http/Controllers/Api/KanbanController.php:17
 * @route '/api/kanban/boards'
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
* @see \App\Http\Controllers\Api\KanbanController::store
 * @see app/Http/Controllers/Api/KanbanController.php:38
 * @route '/api/kanban/boards'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/kanban/boards',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::store
 * @see app/Http/Controllers/Api/KanbanController.php:38
 * @route '/api/kanban/boards'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::store
 * @see app/Http/Controllers/Api/KanbanController.php:38
 * @route '/api/kanban/boards'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::store
 * @see app/Http/Controllers/Api/KanbanController.php:38
 * @route '/api/kanban/boards'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::store
 * @see app/Http/Controllers/Api/KanbanController.php:38
 * @route '/api/kanban/boards'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
/**
* @see \App\Http\Controllers\Api\KanbanController::show
 * @see app/Http/Controllers/Api/KanbanController.php:27
 * @route '/api/kanban/boards/{id}'
 */
export const show = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/kanban/boards/{id}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::show
 * @see app/Http/Controllers/Api/KanbanController.php:27
 * @route '/api/kanban/boards/{id}'
 */
show.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return show.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::show
 * @see app/Http/Controllers/Api/KanbanController.php:27
 * @route '/api/kanban/boards/{id}'
 */
show.get = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\KanbanController::show
 * @see app/Http/Controllers/Api/KanbanController.php:27
 * @route '/api/kanban/boards/{id}'
 */
show.head = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::show
 * @see app/Http/Controllers/Api/KanbanController.php:27
 * @route '/api/kanban/boards/{id}'
 */
    const showForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: show.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::show
 * @see app/Http/Controllers/Api/KanbanController.php:27
 * @route '/api/kanban/boards/{id}'
 */
        showForm.get = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: show.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\KanbanController::show
 * @see app/Http/Controllers/Api/KanbanController.php:27
 * @route '/api/kanban/boards/{id}'
 */
        showForm.head = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: show.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    show.form = showForm
/**
* @see \App\Http\Controllers\Api\KanbanController::update
 * @see app/Http/Controllers/Api/KanbanController.php:49
 * @route '/api/kanban/boards/{id}'
 */
export const update = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

update.definition = {
    methods: ["put"],
    url: '/api/kanban/boards/{id}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::update
 * @see app/Http/Controllers/Api/KanbanController.php:49
 * @route '/api/kanban/boards/{id}'
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
* @see \App\Http\Controllers\Api\KanbanController::update
 * @see app/Http/Controllers/Api/KanbanController.php:49
 * @route '/api/kanban/boards/{id}'
 */
update.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::update
 * @see app/Http/Controllers/Api/KanbanController.php:49
 * @route '/api/kanban/boards/{id}'
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
* @see \App\Http\Controllers\Api\KanbanController::update
 * @see app/Http/Controllers/Api/KanbanController.php:49
 * @route '/api/kanban/boards/{id}'
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
* @see \App\Http\Controllers\Api\KanbanController::destroy
 * @see app/Http/Controllers/Api/KanbanController.php:67
 * @route '/api/kanban/boards/{id}'
 */
export const destroy = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/api/kanban/boards/{id}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::destroy
 * @see app/Http/Controllers/Api/KanbanController.php:67
 * @route '/api/kanban/boards/{id}'
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
* @see \App\Http\Controllers\Api\KanbanController::destroy
 * @see app/Http/Controllers/Api/KanbanController.php:67
 * @route '/api/kanban/boards/{id}'
 */
destroy.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::destroy
 * @see app/Http/Controllers/Api/KanbanController.php:67
 * @route '/api/kanban/boards/{id}'
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
* @see \App\Http\Controllers\Api\KanbanController::destroy
 * @see app/Http/Controllers/Api/KanbanController.php:67
 * @route '/api/kanban/boards/{id}'
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
/**
* @see \App\Http\Controllers\Api\KanbanController::reorderColumns
 * @see app/Http/Controllers/Api/KanbanController.php:142
 * @route '/api/kanban/columns/reorder'
 */
export const reorderColumns = (options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: reorderColumns.url(options),
    method: 'put',
})

reorderColumns.definition = {
    methods: ["put"],
    url: '/api/kanban/columns/reorder',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::reorderColumns
 * @see app/Http/Controllers/Api/KanbanController.php:142
 * @route '/api/kanban/columns/reorder'
 */
reorderColumns.url = (options?: RouteQueryOptions) => {
    return reorderColumns.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::reorderColumns
 * @see app/Http/Controllers/Api/KanbanController.php:142
 * @route '/api/kanban/columns/reorder'
 */
reorderColumns.put = (options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: reorderColumns.url(options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::reorderColumns
 * @see app/Http/Controllers/Api/KanbanController.php:142
 * @route '/api/kanban/columns/reorder'
 */
    const reorderColumnsForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: reorderColumns.url({
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::reorderColumns
 * @see app/Http/Controllers/Api/KanbanController.php:142
 * @route '/api/kanban/columns/reorder'
 */
        reorderColumnsForm.put = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: reorderColumns.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    reorderColumns.form = reorderColumnsForm
/**
* @see \App\Http\Controllers\Api\KanbanController::storeColumn
 * @see app/Http/Controllers/Api/KanbanController.php:82
 * @route '/api/kanban/boards/{id}/columns'
 */
export const storeColumn = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: storeColumn.url(args, options),
    method: 'post',
})

storeColumn.definition = {
    methods: ["post"],
    url: '/api/kanban/boards/{id}/columns',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::storeColumn
 * @see app/Http/Controllers/Api/KanbanController.php:82
 * @route '/api/kanban/boards/{id}/columns'
 */
storeColumn.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return storeColumn.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::storeColumn
 * @see app/Http/Controllers/Api/KanbanController.php:82
 * @route '/api/kanban/boards/{id}/columns'
 */
storeColumn.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: storeColumn.url(args, options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::storeColumn
 * @see app/Http/Controllers/Api/KanbanController.php:82
 * @route '/api/kanban/boards/{id}/columns'
 */
    const storeColumnForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: storeColumn.url(args, options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::storeColumn
 * @see app/Http/Controllers/Api/KanbanController.php:82
 * @route '/api/kanban/boards/{id}/columns'
 */
        storeColumnForm.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: storeColumn.url(args, options),
            method: 'post',
        })
    
    storeColumn.form = storeColumnForm
/**
* @see \App\Http\Controllers\Api\KanbanController::updateColumn
 * @see app/Http/Controllers/Api/KanbanController.php:103
 * @route '/api/kanban/columns/{id}'
 */
export const updateColumn = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateColumn.url(args, options),
    method: 'put',
})

updateColumn.definition = {
    methods: ["put"],
    url: '/api/kanban/columns/{id}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::updateColumn
 * @see app/Http/Controllers/Api/KanbanController.php:103
 * @route '/api/kanban/columns/{id}'
 */
updateColumn.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return updateColumn.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::updateColumn
 * @see app/Http/Controllers/Api/KanbanController.php:103
 * @route '/api/kanban/columns/{id}'
 */
updateColumn.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateColumn.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::updateColumn
 * @see app/Http/Controllers/Api/KanbanController.php:103
 * @route '/api/kanban/columns/{id}'
 */
    const updateColumnForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: updateColumn.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::updateColumn
 * @see app/Http/Controllers/Api/KanbanController.php:103
 * @route '/api/kanban/columns/{id}'
 */
        updateColumnForm.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: updateColumn.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    updateColumn.form = updateColumnForm
/**
* @see \App\Http\Controllers\Api\KanbanController::destroyColumn
 * @see app/Http/Controllers/Api/KanbanController.php:129
 * @route '/api/kanban/columns/{id}'
 */
export const destroyColumn = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroyColumn.url(args, options),
    method: 'delete',
})

destroyColumn.definition = {
    methods: ["delete"],
    url: '/api/kanban/columns/{id}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::destroyColumn
 * @see app/Http/Controllers/Api/KanbanController.php:129
 * @route '/api/kanban/columns/{id}'
 */
destroyColumn.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return destroyColumn.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::destroyColumn
 * @see app/Http/Controllers/Api/KanbanController.php:129
 * @route '/api/kanban/columns/{id}'
 */
destroyColumn.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroyColumn.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::destroyColumn
 * @see app/Http/Controllers/Api/KanbanController.php:129
 * @route '/api/kanban/columns/{id}'
 */
    const destroyColumnForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: destroyColumn.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'DELETE',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::destroyColumn
 * @see app/Http/Controllers/Api/KanbanController.php:129
 * @route '/api/kanban/columns/{id}'
 */
        destroyColumnForm.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: destroyColumn.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'DELETE',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    destroyColumn.form = destroyColumnForm
/**
* @see \App\Http\Controllers\Api\KanbanController::storeCard
 * @see app/Http/Controllers/Api/KanbanController.php:158
 * @route '/api/kanban/columns/{id}/cards'
 */
export const storeCard = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: storeCard.url(args, options),
    method: 'post',
})

storeCard.definition = {
    methods: ["post"],
    url: '/api/kanban/columns/{id}/cards',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::storeCard
 * @see app/Http/Controllers/Api/KanbanController.php:158
 * @route '/api/kanban/columns/{id}/cards'
 */
storeCard.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return storeCard.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::storeCard
 * @see app/Http/Controllers/Api/KanbanController.php:158
 * @route '/api/kanban/columns/{id}/cards'
 */
storeCard.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: storeCard.url(args, options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::storeCard
 * @see app/Http/Controllers/Api/KanbanController.php:158
 * @route '/api/kanban/columns/{id}/cards'
 */
    const storeCardForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: storeCard.url(args, options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::storeCard
 * @see app/Http/Controllers/Api/KanbanController.php:158
 * @route '/api/kanban/columns/{id}/cards'
 */
        storeCardForm.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: storeCard.url(args, options),
            method: 'post',
        })
    
    storeCard.form = storeCardForm
/**
* @see \App\Http\Controllers\Api\KanbanController::updateCard
 * @see app/Http/Controllers/Api/KanbanController.php:181
 * @route '/api/kanban/cards/{id}'
 */
export const updateCard = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateCard.url(args, options),
    method: 'put',
})

updateCard.definition = {
    methods: ["put"],
    url: '/api/kanban/cards/{id}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::updateCard
 * @see app/Http/Controllers/Api/KanbanController.php:181
 * @route '/api/kanban/cards/{id}'
 */
updateCard.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return updateCard.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::updateCard
 * @see app/Http/Controllers/Api/KanbanController.php:181
 * @route '/api/kanban/cards/{id}'
 */
updateCard.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateCard.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::updateCard
 * @see app/Http/Controllers/Api/KanbanController.php:181
 * @route '/api/kanban/cards/{id}'
 */
    const updateCardForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: updateCard.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::updateCard
 * @see app/Http/Controllers/Api/KanbanController.php:181
 * @route '/api/kanban/cards/{id}'
 */
        updateCardForm.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: updateCard.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    updateCard.form = updateCardForm
/**
* @see \App\Http\Controllers\Api\KanbanController::destroyCard
 * @see app/Http/Controllers/Api/KanbanController.php:207
 * @route '/api/kanban/cards/{id}'
 */
export const destroyCard = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroyCard.url(args, options),
    method: 'delete',
})

destroyCard.definition = {
    methods: ["delete"],
    url: '/api/kanban/cards/{id}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::destroyCard
 * @see app/Http/Controllers/Api/KanbanController.php:207
 * @route '/api/kanban/cards/{id}'
 */
destroyCard.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return destroyCard.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::destroyCard
 * @see app/Http/Controllers/Api/KanbanController.php:207
 * @route '/api/kanban/cards/{id}'
 */
destroyCard.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroyCard.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::destroyCard
 * @see app/Http/Controllers/Api/KanbanController.php:207
 * @route '/api/kanban/cards/{id}'
 */
    const destroyCardForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: destroyCard.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'DELETE',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::destroyCard
 * @see app/Http/Controllers/Api/KanbanController.php:207
 * @route '/api/kanban/cards/{id}'
 */
        destroyCardForm.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: destroyCard.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'DELETE',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    destroyCard.form = destroyCardForm
/**
* @see \App\Http\Controllers\Api\KanbanController::moveCard
 * @see app/Http/Controllers/Api/KanbanController.php:220
 * @route '/api/kanban/cards/{id}/move'
 */
export const moveCard = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: moveCard.url(args, options),
    method: 'post',
})

moveCard.definition = {
    methods: ["post"],
    url: '/api/kanban/cards/{id}/move',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::moveCard
 * @see app/Http/Controllers/Api/KanbanController.php:220
 * @route '/api/kanban/cards/{id}/move'
 */
moveCard.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return moveCard.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::moveCard
 * @see app/Http/Controllers/Api/KanbanController.php:220
 * @route '/api/kanban/cards/{id}/move'
 */
moveCard.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: moveCard.url(args, options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::moveCard
 * @see app/Http/Controllers/Api/KanbanController.php:220
 * @route '/api/kanban/cards/{id}/move'
 */
    const moveCardForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: moveCard.url(args, options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::moveCard
 * @see app/Http/Controllers/Api/KanbanController.php:220
 * @route '/api/kanban/cards/{id}/move'
 */
        moveCardForm.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: moveCard.url(args, options),
            method: 'post',
        })
    
    moveCard.form = moveCardForm
/**
* @see \App\Http\Controllers\Api\KanbanController::uploadImage
 * @see app/Http/Controllers/Api/KanbanController.php:272
 * @route '/api/kanban/cards/{id}/images'
 */
export const uploadImage = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: uploadImage.url(args, options),
    method: 'post',
})

uploadImage.definition = {
    methods: ["post"],
    url: '/api/kanban/cards/{id}/images',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::uploadImage
 * @see app/Http/Controllers/Api/KanbanController.php:272
 * @route '/api/kanban/cards/{id}/images'
 */
uploadImage.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return uploadImage.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::uploadImage
 * @see app/Http/Controllers/Api/KanbanController.php:272
 * @route '/api/kanban/cards/{id}/images'
 */
uploadImage.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: uploadImage.url(args, options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::uploadImage
 * @see app/Http/Controllers/Api/KanbanController.php:272
 * @route '/api/kanban/cards/{id}/images'
 */
    const uploadImageForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: uploadImage.url(args, options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::uploadImage
 * @see app/Http/Controllers/Api/KanbanController.php:272
 * @route '/api/kanban/cards/{id}/images'
 */
        uploadImageForm.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: uploadImage.url(args, options),
            method: 'post',
        })
    
    uploadImage.form = uploadImageForm
/**
* @see \App\Http\Controllers\Api\KanbanController::showImage
 * @see app/Http/Controllers/Api/KanbanController.php:295
 * @route '/api/kanban/cards/{id}/images/{filename}'
 */
export const showImage = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: showImage.url(args, options),
    method: 'get',
})

showImage.definition = {
    methods: ["get","head"],
    url: '/api/kanban/cards/{id}/images/{filename}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\KanbanController::showImage
 * @see app/Http/Controllers/Api/KanbanController.php:295
 * @route '/api/kanban/cards/{id}/images/{filename}'
 */
showImage.url = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
                    id: args[0],
                    filename: args[1],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        id: args.id,
                                filename: args.filename,
                }

    return showImage.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace('{filename}', parsedArgs.filename.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\KanbanController::showImage
 * @see app/Http/Controllers/Api/KanbanController.php:295
 * @route '/api/kanban/cards/{id}/images/{filename}'
 */
showImage.get = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: showImage.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\KanbanController::showImage
 * @see app/Http/Controllers/Api/KanbanController.php:295
 * @route '/api/kanban/cards/{id}/images/{filename}'
 */
showImage.head = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: showImage.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\KanbanController::showImage
 * @see app/Http/Controllers/Api/KanbanController.php:295
 * @route '/api/kanban/cards/{id}/images/{filename}'
 */
    const showImageForm = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: showImage.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\KanbanController::showImage
 * @see app/Http/Controllers/Api/KanbanController.php:295
 * @route '/api/kanban/cards/{id}/images/{filename}'
 */
        showImageForm.get = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: showImage.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\KanbanController::showImage
 * @see app/Http/Controllers/Api/KanbanController.php:295
 * @route '/api/kanban/cards/{id}/images/{filename}'
 */
        showImageForm.head = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: showImage.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    showImage.form = showImageForm
const KanbanController = { index, store, show, update, destroy, reorderColumns, storeColumn, updateColumn, destroyColumn, storeCard, updateCard, destroyCard, moveCard, uploadImage, showImage }

export default KanbanController