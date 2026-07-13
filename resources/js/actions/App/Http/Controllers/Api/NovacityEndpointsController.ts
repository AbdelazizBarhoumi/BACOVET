import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:16
 * @route '/novacity-endpoints'
 */
const NovacityEndpointsController = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: NovacityEndpointsController.url(options),
    method: 'get',
})

NovacityEndpointsController.definition = {
    methods: ["get","head"],
    url: '/novacity-endpoints',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:16
 * @route '/novacity-endpoints'
 */
NovacityEndpointsController.url = (options?: RouteQueryOptions) => {
    return NovacityEndpointsController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:16
 * @route '/novacity-endpoints'
 */
NovacityEndpointsController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: NovacityEndpointsController.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:16
 * @route '/novacity-endpoints'
 */
NovacityEndpointsController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: NovacityEndpointsController.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:16
 * @route '/novacity-endpoints'
 */
    const NovacityEndpointsControllerForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: NovacityEndpointsController.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:16
 * @route '/novacity-endpoints'
 */
        NovacityEndpointsControllerForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: NovacityEndpointsController.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:16
 * @route '/novacity-endpoints'
 */
        NovacityEndpointsControllerForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: NovacityEndpointsController.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    NovacityEndpointsController.form = NovacityEndpointsControllerForm
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:56
 * @route '/novacity-endpoints/all'
 */
export const allSamples = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: allSamples.url(options),
    method: 'get',
})

allSamples.definition = {
    methods: ["get","head"],
    url: '/novacity-endpoints/all',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:56
 * @route '/novacity-endpoints/all'
 */
allSamples.url = (options?: RouteQueryOptions) => {
    return allSamples.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:56
 * @route '/novacity-endpoints/all'
 */
allSamples.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: allSamples.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:56
 * @route '/novacity-endpoints/all'
 */
allSamples.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: allSamples.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:56
 * @route '/novacity-endpoints/all'
 */
    const allSamplesForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: allSamples.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:56
 * @route '/novacity-endpoints/all'
 */
        allSamplesForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: allSamples.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:56
 * @route '/novacity-endpoints/all'
 */
        allSamplesForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: allSamples.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    allSamples.form = allSamplesForm
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:101
 * @route '/novacity-endpoints/sample/{slug}'
 */
export const sample = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: sample.url(args, options),
    method: 'get',
})

sample.definition = {
    methods: ["get","head"],
    url: '/novacity-endpoints/sample/{slug}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:101
 * @route '/novacity-endpoints/sample/{slug}'
 */
sample.url = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { slug: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    slug: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        slug: args.slug,
                }

    return sample.definition.url
            .replace('{slug}', parsedArgs.slug.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:101
 * @route '/novacity-endpoints/sample/{slug}'
 */
sample.get = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: sample.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:101
 * @route '/novacity-endpoints/sample/{slug}'
 */
sample.head = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: sample.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:101
 * @route '/novacity-endpoints/sample/{slug}'
 */
    const sampleForm = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: sample.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:101
 * @route '/novacity-endpoints/sample/{slug}'
 */
        sampleForm.get = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: sample.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:101
 * @route '/novacity-endpoints/sample/{slug}'
 */
        sampleForm.head = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: sample.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    sample.form = sampleForm
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:178
 * @route '/novacity-config'
 */
export const config = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: config.url(options),
    method: 'get',
})

config.definition = {
    methods: ["get","head"],
    url: '/novacity-config',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:178
 * @route '/novacity-config'
 */
config.url = (options?: RouteQueryOptions) => {
    return config.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:178
 * @route '/novacity-config'
 */
config.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: config.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:178
 * @route '/novacity-config'
 */
config.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: config.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:178
 * @route '/novacity-config'
 */
    const configForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: config.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:178
 * @route '/novacity-config'
 */
        configForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: config.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:178
 * @route '/novacity-config'
 */
        configForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: config.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    config.form = configForm
NovacityEndpointsController.allSamples = allSamples
NovacityEndpointsController.sample = sample
NovacityEndpointsController.config = config

export default NovacityEndpointsController