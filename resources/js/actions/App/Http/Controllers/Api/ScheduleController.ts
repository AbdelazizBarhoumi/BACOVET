import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\ScheduleController::run
 * @see app/Http/Controllers/Api/ScheduleController.php:13
 * @route '/schedule/run'
 */
export const run = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: run.url(options),
    method: 'get',
})

run.definition = {
    methods: ["get","head"],
    url: '/schedule/run',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ScheduleController::run
 * @see app/Http/Controllers/Api/ScheduleController.php:13
 * @route '/schedule/run'
 */
run.url = (options?: RouteQueryOptions) => {
    return run.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ScheduleController::run
 * @see app/Http/Controllers/Api/ScheduleController.php:13
 * @route '/schedule/run'
 */
run.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: run.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ScheduleController::run
 * @see app/Http/Controllers/Api/ScheduleController.php:13
 * @route '/schedule/run'
 */
run.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: run.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ScheduleController::run
 * @see app/Http/Controllers/Api/ScheduleController.php:13
 * @route '/schedule/run'
 */
    const runForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: run.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ScheduleController::run
 * @see app/Http/Controllers/Api/ScheduleController.php:13
 * @route '/schedule/run'
 */
        runForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: run.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ScheduleController::run
 * @see app/Http/Controllers/Api/ScheduleController.php:13
 * @route '/schedule/run'
 */
        runForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: run.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    run.form = runForm
const ScheduleController = { run }

export default ScheduleController