import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\SettingController::store
 * @see app/Http/Controllers/Api/SettingController.php:12
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
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\SettingController::store
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\SettingController::store
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\SettingController::store
 * @see app/Http/Controllers/Api/SettingController.php:12
 * @route '/api/settings'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
const SettingController = { store }

export default SettingController