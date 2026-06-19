import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\BrowserLogController::store
 * @see app/Http/Controllers/BrowserLogController.php:11
 * @route '/browser-log'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/browser-log',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\BrowserLogController::store
 * @see app/Http/Controllers/BrowserLogController.php:11
 * @route '/browser-log'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\BrowserLogController::store
 * @see app/Http/Controllers/BrowserLogController.php:11
 * @route '/browser-log'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\BrowserLogController::store
 * @see app/Http/Controllers/BrowserLogController.php:11
 * @route '/browser-log'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\BrowserLogController::store
 * @see app/Http/Controllers/BrowserLogController.php:11
 * @route '/browser-log'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
const BrowserLogController = { store }

export default BrowserLogController