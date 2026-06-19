import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\DataSnapshotController::index
 * @see app/Http/Controllers/Api/DataSnapshotController.php:19
 * @route '/data-snapshots'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/data-snapshots',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DataSnapshotController::index
 * @see app/Http/Controllers/Api/DataSnapshotController.php:19
 * @route '/data-snapshots'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataSnapshotController::index
 * @see app/Http/Controllers/Api/DataSnapshotController.php:19
 * @route '/data-snapshots'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DataSnapshotController::index
 * @see app/Http/Controllers/Api/DataSnapshotController.php:19
 * @route '/data-snapshots'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DataSnapshotController::index
 * @see app/Http/Controllers/Api/DataSnapshotController.php:19
 * @route '/data-snapshots'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DataSnapshotController::index
 * @see app/Http/Controllers/Api/DataSnapshotController.php:19
 * @route '/data-snapshots'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DataSnapshotController::index
 * @see app/Http/Controllers/Api/DataSnapshotController.php:19
 * @route '/data-snapshots'
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
* @see \App\Http\Controllers\Api\DataSnapshotController::show
 * @see app/Http/Controllers/Api/DataSnapshotController.php:29
 * @route '/data-snapshots/{tableName}'
 */
export const show = (args: { tableName: string | number } | [tableName: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/data-snapshots/{tableName}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DataSnapshotController::show
 * @see app/Http/Controllers/Api/DataSnapshotController.php:29
 * @route '/data-snapshots/{tableName}'
 */
show.url = (args: { tableName: string | number } | [tableName: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { tableName: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    tableName: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        tableName: args.tableName,
                }

    return show.definition.url
            .replace('{tableName}', parsedArgs.tableName.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataSnapshotController::show
 * @see app/Http/Controllers/Api/DataSnapshotController.php:29
 * @route '/data-snapshots/{tableName}'
 */
show.get = (args: { tableName: string | number } | [tableName: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DataSnapshotController::show
 * @see app/Http/Controllers/Api/DataSnapshotController.php:29
 * @route '/data-snapshots/{tableName}'
 */
show.head = (args: { tableName: string | number } | [tableName: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DataSnapshotController::show
 * @see app/Http/Controllers/Api/DataSnapshotController.php:29
 * @route '/data-snapshots/{tableName}'
 */
    const showForm = (args: { tableName: string | number } | [tableName: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: show.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DataSnapshotController::show
 * @see app/Http/Controllers/Api/DataSnapshotController.php:29
 * @route '/data-snapshots/{tableName}'
 */
        showForm.get = (args: { tableName: string | number } | [tableName: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: show.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DataSnapshotController::show
 * @see app/Http/Controllers/Api/DataSnapshotController.php:29
 * @route '/data-snapshots/{tableName}'
 */
        showForm.head = (args: { tableName: string | number } | [tableName: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
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
* @see \App\Http\Controllers\Api\DataSnapshotController::snapshot
 * @see app/Http/Controllers/Api/DataSnapshotController.php:45
 * @route '/data-snapshots/snapshot/{id}'
 */
export const snapshot = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: snapshot.url(args, options),
    method: 'get',
})

snapshot.definition = {
    methods: ["get","head"],
    url: '/data-snapshots/snapshot/{id}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DataSnapshotController::snapshot
 * @see app/Http/Controllers/Api/DataSnapshotController.php:45
 * @route '/data-snapshots/snapshot/{id}'
 */
snapshot.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return snapshot.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataSnapshotController::snapshot
 * @see app/Http/Controllers/Api/DataSnapshotController.php:45
 * @route '/data-snapshots/snapshot/{id}'
 */
snapshot.get = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: snapshot.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DataSnapshotController::snapshot
 * @see app/Http/Controllers/Api/DataSnapshotController.php:45
 * @route '/data-snapshots/snapshot/{id}'
 */
snapshot.head = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: snapshot.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DataSnapshotController::snapshot
 * @see app/Http/Controllers/Api/DataSnapshotController.php:45
 * @route '/data-snapshots/snapshot/{id}'
 */
    const snapshotForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: snapshot.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DataSnapshotController::snapshot
 * @see app/Http/Controllers/Api/DataSnapshotController.php:45
 * @route '/data-snapshots/snapshot/{id}'
 */
        snapshotForm.get = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: snapshot.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DataSnapshotController::snapshot
 * @see app/Http/Controllers/Api/DataSnapshotController.php:45
 * @route '/data-snapshots/snapshot/{id}'
 */
        snapshotForm.head = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: snapshot.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    snapshot.form = snapshotForm
const DataSnapshotController = { index, show, snapshot }

export default DataSnapshotController