import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:32
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
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:32
 * @route '/novacity-endpoints'
 */
NovacityEndpointsController.url = (options?: RouteQueryOptions) => {
    return NovacityEndpointsController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:32
 * @route '/novacity-endpoints'
 */
NovacityEndpointsController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: NovacityEndpointsController.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:32
 * @route '/novacity-endpoints'
 */
NovacityEndpointsController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: NovacityEndpointsController.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:32
 * @route '/novacity-endpoints'
 */
    const NovacityEndpointsControllerForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: NovacityEndpointsController.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:32
 * @route '/novacity-endpoints'
 */
        NovacityEndpointsControllerForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: NovacityEndpointsController.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::__invoke
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:32
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
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:63
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
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:63
 * @route '/novacity-endpoints/all'
 */
allSamples.url = (options?: RouteQueryOptions) => {
    return allSamples.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:63
 * @route '/novacity-endpoints/all'
 */
allSamples.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: allSamples.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:63
 * @route '/novacity-endpoints/all'
 */
allSamples.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: allSamples.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:63
 * @route '/novacity-endpoints/all'
 */
    const allSamplesForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: allSamples.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:63
 * @route '/novacity-endpoints/all'
 */
        allSamplesForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: allSamples.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::allSamples
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:63
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
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:97
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
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:97
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
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:97
 * @route '/novacity-endpoints/sample/{slug}'
 */
sample.get = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: sample.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:97
 * @route '/novacity-endpoints/sample/{slug}'
 */
sample.head = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: sample.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:97
 * @route '/novacity-endpoints/sample/{slug}'
 */
    const sampleForm = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: sample.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:97
 * @route '/novacity-endpoints/sample/{slug}'
 */
        sampleForm.get = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: sample.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::sample
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:97
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
* @see \App\Http\Controllers\Api\NovacityEndpointsController::testAndSave
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:455
 * @route '/novacity-endpoints/test-and-save'
 */
export const testAndSave = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: testAndSave.url(options),
    method: 'post',
})

testAndSave.definition = {
    methods: ["post"],
    url: '/novacity-endpoints/test-and-save',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::testAndSave
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:455
 * @route '/novacity-endpoints/test-and-save'
 */
testAndSave.url = (options?: RouteQueryOptions) => {
    return testAndSave.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::testAndSave
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:455
 * @route '/novacity-endpoints/test-and-save'
 */
testAndSave.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: testAndSave.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::testAndSave
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:455
 * @route '/novacity-endpoints/test-and-save'
 */
    const testAndSaveForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: testAndSave.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::testAndSave
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:455
 * @route '/novacity-endpoints/test-and-save'
 */
        testAndSaveForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: testAndSave.url(options),
            method: 'post',
        })
    
    testAndSave.form = testAndSaveForm
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:443
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
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:443
 * @route '/novacity-config'
 */
config.url = (options?: RouteQueryOptions) => {
    return config.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:443
 * @route '/novacity-config'
 */
config.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: config.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:443
 * @route '/novacity-config'
 */
config.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: config.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:443
 * @route '/novacity-config'
 */
    const configForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: config.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:443
 * @route '/novacity-config'
 */
        configForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: config.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::config
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:443
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
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::structure
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:394
 * @route '/novacity-endpoints/structure'
 */
export const structure = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: structure.url(options),
    method: 'get',
})

structure.definition = {
    methods: ["get","head"],
    url: '/novacity-endpoints/structure',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::structure
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:394
 * @route '/novacity-endpoints/structure'
 */
structure.url = (options?: RouteQueryOptions) => {
    return structure.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::structure
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:394
 * @route '/novacity-endpoints/structure'
 */
structure.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: structure.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::structure
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:394
 * @route '/novacity-endpoints/structure'
 */
structure.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: structure.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::structure
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:394
 * @route '/novacity-endpoints/structure'
 */
    const structureForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: structure.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::structure
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:394
 * @route '/novacity-endpoints/structure'
 */
        structureForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: structure.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::structure
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:394
 * @route '/novacity-endpoints/structure'
 */
        structureForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: structure.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    structure.form = structureForm
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::schema
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:414
 * @route '/novacity-endpoints/schema'
 */
export const schema = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: schema.url(options),
    method: 'get',
})

schema.definition = {
    methods: ["get","head"],
    url: '/novacity-endpoints/schema',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::schema
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:414
 * @route '/novacity-endpoints/schema'
 */
schema.url = (options?: RouteQueryOptions) => {
    return schema.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::schema
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:414
 * @route '/novacity-endpoints/schema'
 */
schema.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: schema.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::schema
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:414
 * @route '/novacity-endpoints/schema'
 */
schema.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: schema.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::schema
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:414
 * @route '/novacity-endpoints/schema'
 */
    const schemaForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: schema.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::schema
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:414
 * @route '/novacity-endpoints/schema'
 */
        schemaForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: schema.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::schema
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:414
 * @route '/novacity-endpoints/schema'
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
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::index
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:117
 * @route '/novacity-endpoints/list'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/novacity-endpoints/list',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::index
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:117
 * @route '/novacity-endpoints/list'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::index
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:117
 * @route '/novacity-endpoints/list'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::index
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:117
 * @route '/novacity-endpoints/list'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::index
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:117
 * @route '/novacity-endpoints/list'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::index
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:117
 * @route '/novacity-endpoints/list'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::index
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:117
 * @route '/novacity-endpoints/list'
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
* @see \App\Http\Controllers\Api\NovacityEndpointsController::store
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:204
 * @route '/novacity-endpoints'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/novacity-endpoints',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::store
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:204
 * @route '/novacity-endpoints'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::store
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:204
 * @route '/novacity-endpoints'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::store
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:204
 * @route '/novacity-endpoints'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::store
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:204
 * @route '/novacity-endpoints'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::reorder
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:344
 * @route '/novacity-endpoints/reorder'
 */
export const reorder = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: reorder.url(options),
    method: 'post',
})

reorder.definition = {
    methods: ["post"],
    url: '/novacity-endpoints/reorder',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::reorder
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:344
 * @route '/novacity-endpoints/reorder'
 */
reorder.url = (options?: RouteQueryOptions) => {
    return reorder.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::reorder
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:344
 * @route '/novacity-endpoints/reorder'
 */
reorder.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: reorder.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::reorder
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:344
 * @route '/novacity-endpoints/reorder'
 */
    const reorderForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: reorder.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::reorder
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:344
 * @route '/novacity-endpoints/reorder'
 */
        reorderForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: reorder.url(options),
            method: 'post',
        })
    
    reorder.form = reorderForm
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::show
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:190
 * @route '/novacity-endpoints/{id}'
 */
export const show = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/novacity-endpoints/{id}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::show
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:190
 * @route '/novacity-endpoints/{id}'
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
* @see \App\Http\Controllers\Api\NovacityEndpointsController::show
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:190
 * @route '/novacity-endpoints/{id}'
 */
show.get = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::show
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:190
 * @route '/novacity-endpoints/{id}'
 */
show.head = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::show
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:190
 * @route '/novacity-endpoints/{id}'
 */
    const showForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: show.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::show
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:190
 * @route '/novacity-endpoints/{id}'
 */
        showForm.get = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: show.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::show
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:190
 * @route '/novacity-endpoints/{id}'
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
* @see \App\Http\Controllers\Api\NovacityEndpointsController::update
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:240
 * @route '/novacity-endpoints/{id}'
 */
export const update = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

update.definition = {
    methods: ["put"],
    url: '/novacity-endpoints/{id}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::update
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:240
 * @route '/novacity-endpoints/{id}'
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
* @see \App\Http\Controllers\Api\NovacityEndpointsController::update
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:240
 * @route '/novacity-endpoints/{id}'
 */
update.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::update
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:240
 * @route '/novacity-endpoints/{id}'
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
* @see \App\Http\Controllers\Api\NovacityEndpointsController::update
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:240
 * @route '/novacity-endpoints/{id}'
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
* @see \App\Http\Controllers\Api\NovacityEndpointsController::destroy
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:288
 * @route '/novacity-endpoints/{id}'
 */
export const destroy = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/novacity-endpoints/{id}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::destroy
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:288
 * @route '/novacity-endpoints/{id}'
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
* @see \App\Http\Controllers\Api\NovacityEndpointsController::destroy
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:288
 * @route '/novacity-endpoints/{id}'
 */
destroy.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::destroy
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:288
 * @route '/novacity-endpoints/{id}'
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
* @see \App\Http\Controllers\Api\NovacityEndpointsController::destroy
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:288
 * @route '/novacity-endpoints/{id}'
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
* @see \App\Http\Controllers\Api\NovacityEndpointsController::duplicate
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:314
 * @route '/novacity-endpoints/{id}/duplicate'
 */
export const duplicate = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: duplicate.url(args, options),
    method: 'post',
})

duplicate.definition = {
    methods: ["post"],
    url: '/novacity-endpoints/{id}/duplicate',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::duplicate
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:314
 * @route '/novacity-endpoints/{id}/duplicate'
 */
duplicate.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return duplicate.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::duplicate
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:314
 * @route '/novacity-endpoints/{id}/duplicate'
 */
duplicate.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: duplicate.url(args, options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::duplicate
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:314
 * @route '/novacity-endpoints/{id}/duplicate'
 */
    const duplicateForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: duplicate.url(args, options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\NovacityEndpointsController::duplicate
 * @see app/Http/Controllers/Api/NovacityEndpointsController.php:314
 * @route '/novacity-endpoints/{id}/duplicate'
 */
        duplicateForm.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: duplicate.url(args, options),
            method: 'post',
        })
    
    duplicate.form = duplicateForm
NovacityEndpointsController.allSamples = allSamples
NovacityEndpointsController.sample = sample
NovacityEndpointsController.testAndSave = testAndSave
NovacityEndpointsController.config = config
NovacityEndpointsController.structure = structure
NovacityEndpointsController.schema = schema
NovacityEndpointsController.index = index
NovacityEndpointsController.store = store
NovacityEndpointsController.reorder = reorder
NovacityEndpointsController.show = show
NovacityEndpointsController.update = update
NovacityEndpointsController.destroy = destroy
NovacityEndpointsController.duplicate = duplicate

export default NovacityEndpointsController