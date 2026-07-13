import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\DataMappingController::index
 * @see app/Http/Controllers/Api/DataMappingController.php:14
 * @route '/data-mappings'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/data-mappings',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DataMappingController::index
 * @see app/Http/Controllers/Api/DataMappingController.php:14
 * @route '/data-mappings'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataMappingController::index
 * @see app/Http/Controllers/Api/DataMappingController.php:14
 * @route '/data-mappings'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DataMappingController::index
 * @see app/Http/Controllers/Api/DataMappingController.php:14
 * @route '/data-mappings'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DataMappingController::index
 * @see app/Http/Controllers/Api/DataMappingController.php:14
 * @route '/data-mappings'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DataMappingController::index
 * @see app/Http/Controllers/Api/DataMappingController.php:14
 * @route '/data-mappings'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DataMappingController::index
 * @see app/Http/Controllers/Api/DataMappingController.php:14
 * @route '/data-mappings'
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
* @see \App\Http\Controllers\Api\DataMappingController::store
 * @see app/Http/Controllers/Api/DataMappingController.php:19
 * @route '/data-mappings'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/data-mappings',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\DataMappingController::store
 * @see app/Http/Controllers/Api/DataMappingController.php:19
 * @route '/data-mappings'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataMappingController::store
 * @see app/Http/Controllers/Api/DataMappingController.php:19
 * @route '/data-mappings'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\DataMappingController::store
 * @see app/Http/Controllers/Api/DataMappingController.php:19
 * @route '/data-mappings'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\DataMappingController::store
 * @see app/Http/Controllers/Api/DataMappingController.php:19
 * @route '/data-mappings'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
/**
* @see \App\Http\Controllers\Api\DataMappingController::update
 * @see app/Http/Controllers/Api/DataMappingController.php:61
 * @route '/data-mappings/{id}'
 */
export const update = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

update.definition = {
    methods: ["put"],
    url: '/data-mappings/{id}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\DataMappingController::update
 * @see app/Http/Controllers/Api/DataMappingController.php:61
 * @route '/data-mappings/{id}'
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
* @see \App\Http\Controllers\Api\DataMappingController::update
 * @see app/Http/Controllers/Api/DataMappingController.php:61
 * @route '/data-mappings/{id}'
 */
update.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\DataMappingController::update
 * @see app/Http/Controllers/Api/DataMappingController.php:61
 * @route '/data-mappings/{id}'
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
* @see \App\Http\Controllers\Api\DataMappingController::update
 * @see app/Http/Controllers/Api/DataMappingController.php:61
 * @route '/data-mappings/{id}'
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
* @see \App\Http\Controllers\Api\DataMappingController::destroy
 * @see app/Http/Controllers/Api/DataMappingController.php:104
 * @route '/data-mappings/{id}'
 */
export const destroy = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/data-mappings/{id}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\DataMappingController::destroy
 * @see app/Http/Controllers/Api/DataMappingController.php:104
 * @route '/data-mappings/{id}'
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
* @see \App\Http\Controllers\Api\DataMappingController::destroy
 * @see app/Http/Controllers/Api/DataMappingController.php:104
 * @route '/data-mappings/{id}'
 */
destroy.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\DataMappingController::destroy
 * @see app/Http/Controllers/Api/DataMappingController.php:104
 * @route '/data-mappings/{id}'
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
* @see \App\Http\Controllers\Api\DataMappingController::destroy
 * @see app/Http/Controllers/Api/DataMappingController.php:104
 * @route '/data-mappings/{id}'
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
* @see \App\Http\Controllers\Api\DataMappingController::batchUpdate
 * @see app/Http/Controllers/Api/DataMappingController.php:116
 * @route '/data-mappings/batch'
 */
export const batchUpdate = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: batchUpdate.url(options),
    method: 'post',
})

batchUpdate.definition = {
    methods: ["post"],
    url: '/data-mappings/batch',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\DataMappingController::batchUpdate
 * @see app/Http/Controllers/Api/DataMappingController.php:116
 * @route '/data-mappings/batch'
 */
batchUpdate.url = (options?: RouteQueryOptions) => {
    return batchUpdate.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataMappingController::batchUpdate
 * @see app/Http/Controllers/Api/DataMappingController.php:116
 * @route '/data-mappings/batch'
 */
batchUpdate.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: batchUpdate.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\DataMappingController::batchUpdate
 * @see app/Http/Controllers/Api/DataMappingController.php:116
 * @route '/data-mappings/batch'
 */
    const batchUpdateForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: batchUpdate.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\DataMappingController::batchUpdate
 * @see app/Http/Controllers/Api/DataMappingController.php:116
 * @route '/data-mappings/batch'
 */
        batchUpdateForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: batchUpdate.url(options),
            method: 'post',
        })
    
    batchUpdate.form = batchUpdateForm
/**
* @see \App\Http\Controllers\Api\DataMappingController::seedFromKpiSeed
 * @see app/Http/Controllers/Api/DataMappingController.php:180
 * @route '/data-mappings/seed'
 */
export const seedFromKpiSeed = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: seedFromKpiSeed.url(options),
    method: 'post',
})

seedFromKpiSeed.definition = {
    methods: ["post"],
    url: '/data-mappings/seed',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\DataMappingController::seedFromKpiSeed
 * @see app/Http/Controllers/Api/DataMappingController.php:180
 * @route '/data-mappings/seed'
 */
seedFromKpiSeed.url = (options?: RouteQueryOptions) => {
    return seedFromKpiSeed.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataMappingController::seedFromKpiSeed
 * @see app/Http/Controllers/Api/DataMappingController.php:180
 * @route '/data-mappings/seed'
 */
seedFromKpiSeed.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: seedFromKpiSeed.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\DataMappingController::seedFromKpiSeed
 * @see app/Http/Controllers/Api/DataMappingController.php:180
 * @route '/data-mappings/seed'
 */
    const seedFromKpiSeedForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: seedFromKpiSeed.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\DataMappingController::seedFromKpiSeed
 * @see app/Http/Controllers/Api/DataMappingController.php:180
 * @route '/data-mappings/seed'
 */
        seedFromKpiSeedForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: seedFromKpiSeed.url(options),
            method: 'post',
        })
    
    seedFromKpiSeed.form = seedFromKpiSeedForm
/**
* @see \App\Http\Controllers\Api\DataMappingController::auditLogs
 * @see app/Http/Controllers/Api/DataMappingController.php:218
 * @route '/data-mappings/audit-logs'
 */
export const auditLogs = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: auditLogs.url(options),
    method: 'get',
})

auditLogs.definition = {
    methods: ["get","head"],
    url: '/data-mappings/audit-logs',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DataMappingController::auditLogs
 * @see app/Http/Controllers/Api/DataMappingController.php:218
 * @route '/data-mappings/audit-logs'
 */
auditLogs.url = (options?: RouteQueryOptions) => {
    return auditLogs.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataMappingController::auditLogs
 * @see app/Http/Controllers/Api/DataMappingController.php:218
 * @route '/data-mappings/audit-logs'
 */
auditLogs.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: auditLogs.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DataMappingController::auditLogs
 * @see app/Http/Controllers/Api/DataMappingController.php:218
 * @route '/data-mappings/audit-logs'
 */
auditLogs.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: auditLogs.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DataMappingController::auditLogs
 * @see app/Http/Controllers/Api/DataMappingController.php:218
 * @route '/data-mappings/audit-logs'
 */
    const auditLogsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: auditLogs.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DataMappingController::auditLogs
 * @see app/Http/Controllers/Api/DataMappingController.php:218
 * @route '/data-mappings/audit-logs'
 */
        auditLogsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: auditLogs.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DataMappingController::auditLogs
 * @see app/Http/Controllers/Api/DataMappingController.php:218
 * @route '/data-mappings/audit-logs'
 */
        auditLogsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: auditLogs.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    auditLogs.form = auditLogsForm
const DataMappingController = { index, store, update, destroy, batchUpdate, seedFromKpiSeed, auditLogs }

export default DataMappingController