import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\MaintenanceController::commands
 * @see app/Http/Controllers/Api/MaintenanceController.php:14
 * @route '/admin/maintenance/commands'
 */
export const commands = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: commands.url(options),
    method: 'get',
})

commands.definition = {
    methods: ["get","head"],
    url: '/admin/maintenance/commands',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\MaintenanceController::commands
 * @see app/Http/Controllers/Api/MaintenanceController.php:14
 * @route '/admin/maintenance/commands'
 */
commands.url = (options?: RouteQueryOptions) => {
    return commands.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MaintenanceController::commands
 * @see app/Http/Controllers/Api/MaintenanceController.php:14
 * @route '/admin/maintenance/commands'
 */
commands.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: commands.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\MaintenanceController::commands
 * @see app/Http/Controllers/Api/MaintenanceController.php:14
 * @route '/admin/maintenance/commands'
 */
commands.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: commands.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\MaintenanceController::commands
 * @see app/Http/Controllers/Api/MaintenanceController.php:14
 * @route '/admin/maintenance/commands'
 */
    const commandsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: commands.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\MaintenanceController::commands
 * @see app/Http/Controllers/Api/MaintenanceController.php:14
 * @route '/admin/maintenance/commands'
 */
        commandsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: commands.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\MaintenanceController::commands
 * @see app/Http/Controllers/Api/MaintenanceController.php:14
 * @route '/admin/maintenance/commands'
 */
        commandsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: commands.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    commands.form = commandsForm
/**
* @see \App\Http\Controllers\Api\MaintenanceController::start
 * @see app/Http/Controllers/Api/MaintenanceController.php:23
 * @route '/admin/maintenance/run'
 */
export const start = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: start.url(options),
    method: 'post',
})

start.definition = {
    methods: ["post"],
    url: '/admin/maintenance/run',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\MaintenanceController::start
 * @see app/Http/Controllers/Api/MaintenanceController.php:23
 * @route '/admin/maintenance/run'
 */
start.url = (options?: RouteQueryOptions) => {
    return start.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MaintenanceController::start
 * @see app/Http/Controllers/Api/MaintenanceController.php:23
 * @route '/admin/maintenance/run'
 */
start.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: start.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\MaintenanceController::start
 * @see app/Http/Controllers/Api/MaintenanceController.php:23
 * @route '/admin/maintenance/run'
 */
    const startForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: start.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\MaintenanceController::start
 * @see app/Http/Controllers/Api/MaintenanceController.php:23
 * @route '/admin/maintenance/run'
 */
        startForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: start.url(options),
            method: 'post',
        })
    
    start.form = startForm
const MaintenanceController = { commands, start }

export default MaintenanceController