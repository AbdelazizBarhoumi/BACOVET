import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v5/endpoint-datasets'
 */
const indexedeac22e0b4b55a526f755fe95e53b79 = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: indexedeac22e0b4b55a526f755fe95e53b79.url(options),
    method: 'get',
})

indexedeac22e0b4b55a526f755fe95e53b79.definition = {
    methods: ["get","head"],
    url: '/api/v5/endpoint-datasets',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v5/endpoint-datasets'
 */
indexedeac22e0b4b55a526f755fe95e53b79.url = (options?: RouteQueryOptions) => {
    return indexedeac22e0b4b55a526f755fe95e53b79.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v5/endpoint-datasets'
 */
indexedeac22e0b4b55a526f755fe95e53b79.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: indexedeac22e0b4b55a526f755fe95e53b79.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v5/endpoint-datasets'
 */
indexedeac22e0b4b55a526f755fe95e53b79.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: indexedeac22e0b4b55a526f755fe95e53b79.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v5/endpoint-datasets'
 */
    const indexedeac22e0b4b55a526f755fe95e53b79Form = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: indexedeac22e0b4b55a526f755fe95e53b79.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v5/endpoint-datasets'
 */
        indexedeac22e0b4b55a526f755fe95e53b79Form.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: indexedeac22e0b4b55a526f755fe95e53b79.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v5/endpoint-datasets'
 */
        indexedeac22e0b4b55a526f755fe95e53b79Form.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: indexedeac22e0b4b55a526f755fe95e53b79.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    indexedeac22e0b4b55a526f755fe95e53b79.form = indexedeac22e0b4b55a526f755fe95e53b79Form
    /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v6/endpoint-datasets'
 */
const index987e6948f94c450a6bfe7149e002e48d = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index987e6948f94c450a6bfe7149e002e48d.url(options),
    method: 'get',
})

index987e6948f94c450a6bfe7149e002e48d.definition = {
    methods: ["get","head"],
    url: '/api/v6/endpoint-datasets',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v6/endpoint-datasets'
 */
index987e6948f94c450a6bfe7149e002e48d.url = (options?: RouteQueryOptions) => {
    return index987e6948f94c450a6bfe7149e002e48d.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v6/endpoint-datasets'
 */
index987e6948f94c450a6bfe7149e002e48d.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index987e6948f94c450a6bfe7149e002e48d.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v6/endpoint-datasets'
 */
index987e6948f94c450a6bfe7149e002e48d.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index987e6948f94c450a6bfe7149e002e48d.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v6/endpoint-datasets'
 */
    const index987e6948f94c450a6bfe7149e002e48dForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index987e6948f94c450a6bfe7149e002e48d.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v6/endpoint-datasets'
 */
        index987e6948f94c450a6bfe7149e002e48dForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index987e6948f94c450a6bfe7149e002e48d.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::index
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:37
 * @route '/api/v6/endpoint-datasets'
 */
        index987e6948f94c450a6bfe7149e002e48dForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index987e6948f94c450a6bfe7149e002e48d.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    index987e6948f94c450a6bfe7149e002e48d.form = index987e6948f94c450a6bfe7149e002e48dForm

export const index = {
    '/api/v5/endpoint-datasets': indexedeac22e0b4b55a526f755fe95e53b79,
    '/api/v6/endpoint-datasets': index987e6948f94c450a6bfe7149e002e48d,
}

/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::schema
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:17
 * @route '/api/v5/schema'
 */
export const schema = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: schema.url(options),
    method: 'get',
})

schema.definition = {
    methods: ["get","head"],
    url: '/api/v5/schema',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::schema
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:17
 * @route '/api/v5/schema'
 */
schema.url = (options?: RouteQueryOptions) => {
    return schema.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::schema
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:17
 * @route '/api/v5/schema'
 */
schema.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: schema.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::schema
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:17
 * @route '/api/v5/schema'
 */
schema.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: schema.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::schema
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:17
 * @route '/api/v5/schema'
 */
    const schemaForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: schema.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::schema
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:17
 * @route '/api/v5/schema'
 */
        schemaForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: schema.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\EndpointDatasetV5Controller::schema
 * @see app/Http/Controllers/Api/EndpointDatasetV5Controller.php:17
 * @route '/api/v5/schema'
 */
        schemaForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: schema.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    schema.form = schemaForm
const EndpointDatasetV5Controller = { index, schema }

export default EndpointDatasetV5Controller