import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\SettingController::store
 * @see app/Http/Controllers/Api/SettingController.php:18
 * @route '/api/settings'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/settings',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\SettingController::store
 * @see app/Http/Controllers/Api/SettingController.php:18
 * @route '/api/settings'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\SettingController::store
 * @see app/Http/Controllers/Api/SettingController.php:18
 * @route '/api/settings'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\SettingController::store
 * @see app/Http/Controllers/Api/SettingController.php:18
 * @route '/api/settings'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\SettingController::store
 * @see app/Http/Controllers/Api/SettingController.php:18
 * @route '/api/settings'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
/**
* @see \App\Http\Controllers\Api\SettingController::show
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings/{key}'
 */
export const show = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/settings/{key}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\SettingController::show
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings/{key}'
 */
show.url = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { key: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    key: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        key: args.key,
                }

    return show.definition.url
            .replace('{key}', parsedArgs.key.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\SettingController::show
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings/{key}'
 */
show.get = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\SettingController::show
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings/{key}'
 */
show.head = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\SettingController::show
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings/{key}'
 */
    const showForm = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: show.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\SettingController::show
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings/{key}'
 */
        showForm.get = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: show.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\SettingController::show
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings/{key}'
 */
        showForm.head = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: show.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    show.form = showForm
const SettingController = { store, show }

export default SettingController