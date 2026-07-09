import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\MethodesController::kpis
 * @see app/Http/Controllers/Api/MethodesController.php:12
 * @route '/methods/kpis'
 */
export const kpis = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})

kpis.definition = {
    methods: ["get","head"],
    url: '/methods/kpis',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\MethodesController::kpis
 * @see app/Http/Controllers/Api/MethodesController.php:12
 * @route '/methods/kpis'
 */
kpis.url = (options?: RouteQueryOptions) => {
    return kpis.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MethodesController::kpis
 * @see app/Http/Controllers/Api/MethodesController.php:12
 * @route '/methods/kpis'
 */
kpis.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\MethodesController::kpis
 * @see app/Http/Controllers/Api/MethodesController.php:12
 * @route '/methods/kpis'
 */
kpis.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: kpis.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\MethodesController::kpis
 * @see app/Http/Controllers/Api/MethodesController.php:12
 * @route '/methods/kpis'
 */
    const kpisForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: kpis.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\MethodesController::kpis
 * @see app/Http/Controllers/Api/MethodesController.php:12
 * @route '/methods/kpis'
 */
        kpisForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: kpis.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\MethodesController::kpis
 * @see app/Http/Controllers/Api/MethodesController.php:12
 * @route '/methods/kpis'
 */
        kpisForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: kpis.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    kpis.form = kpisForm
/**
* @see \App\Http\Controllers\Api\MethodesController::archivageDetail
 * @see app/Http/Controllers/Api/MethodesController.php:124
 * @route '/methods/archivage-detail'
 */
export const archivageDetail = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: archivageDetail.url(options),
    method: 'get',
})

archivageDetail.definition = {
    methods: ["get","head"],
    url: '/methods/archivage-detail',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\MethodesController::archivageDetail
 * @see app/Http/Controllers/Api/MethodesController.php:124
 * @route '/methods/archivage-detail'
 */
archivageDetail.url = (options?: RouteQueryOptions) => {
    return archivageDetail.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MethodesController::archivageDetail
 * @see app/Http/Controllers/Api/MethodesController.php:124
 * @route '/methods/archivage-detail'
 */
archivageDetail.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: archivageDetail.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\MethodesController::archivageDetail
 * @see app/Http/Controllers/Api/MethodesController.php:124
 * @route '/methods/archivage-detail'
 */
archivageDetail.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: archivageDetail.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\MethodesController::archivageDetail
 * @see app/Http/Controllers/Api/MethodesController.php:124
 * @route '/methods/archivage-detail'
 */
    const archivageDetailForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: archivageDetail.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\MethodesController::archivageDetail
 * @see app/Http/Controllers/Api/MethodesController.php:124
 * @route '/methods/archivage-detail'
 */
        archivageDetailForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: archivageDetail.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\MethodesController::archivageDetail
 * @see app/Http/Controllers/Api/MethodesController.php:124
 * @route '/methods/archivage-detail'
 */
        archivageDetailForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: archivageDetail.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    archivageDetail.form = archivageDetailForm
/**
* @see \App\Http\Controllers\Api\MethodesController::respectTempsDetail
 * @see app/Http/Controllers/Api/MethodesController.php:137
 * @route '/methods/respect-temps-detail'
 */
export const respectTempsDetail = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: respectTempsDetail.url(options),
    method: 'get',
})

respectTempsDetail.definition = {
    methods: ["get","head"],
    url: '/methods/respect-temps-detail',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\MethodesController::respectTempsDetail
 * @see app/Http/Controllers/Api/MethodesController.php:137
 * @route '/methods/respect-temps-detail'
 */
respectTempsDetail.url = (options?: RouteQueryOptions) => {
    return respectTempsDetail.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MethodesController::respectTempsDetail
 * @see app/Http/Controllers/Api/MethodesController.php:137
 * @route '/methods/respect-temps-detail'
 */
respectTempsDetail.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: respectTempsDetail.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\MethodesController::respectTempsDetail
 * @see app/Http/Controllers/Api/MethodesController.php:137
 * @route '/methods/respect-temps-detail'
 */
respectTempsDetail.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: respectTempsDetail.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\MethodesController::respectTempsDetail
 * @see app/Http/Controllers/Api/MethodesController.php:137
 * @route '/methods/respect-temps-detail'
 */
    const respectTempsDetailForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: respectTempsDetail.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\MethodesController::respectTempsDetail
 * @see app/Http/Controllers/Api/MethodesController.php:137
 * @route '/methods/respect-temps-detail'
 */
        respectTempsDetailForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: respectTempsDetail.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\MethodesController::respectTempsDetail
 * @see app/Http/Controllers/Api/MethodesController.php:137
 * @route '/methods/respect-temps-detail'
 */
        respectTempsDetailForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: respectTempsDetail.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    respectTempsDetail.form = respectTempsDetailForm
/**
* @see \App\Http\Controllers\Api\MethodesController::tempsAcceptesDetail
 * @see app/Http/Controllers/Api/MethodesController.php:153
 * @route '/methods/temps-acceptes-detail'
 */
export const tempsAcceptesDetail = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: tempsAcceptesDetail.url(options),
    method: 'get',
})

tempsAcceptesDetail.definition = {
    methods: ["get","head"],
    url: '/methods/temps-acceptes-detail',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\MethodesController::tempsAcceptesDetail
 * @see app/Http/Controllers/Api/MethodesController.php:153
 * @route '/methods/temps-acceptes-detail'
 */
tempsAcceptesDetail.url = (options?: RouteQueryOptions) => {
    return tempsAcceptesDetail.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MethodesController::tempsAcceptesDetail
 * @see app/Http/Controllers/Api/MethodesController.php:153
 * @route '/methods/temps-acceptes-detail'
 */
tempsAcceptesDetail.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: tempsAcceptesDetail.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\MethodesController::tempsAcceptesDetail
 * @see app/Http/Controllers/Api/MethodesController.php:153
 * @route '/methods/temps-acceptes-detail'
 */
tempsAcceptesDetail.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: tempsAcceptesDetail.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\MethodesController::tempsAcceptesDetail
 * @see app/Http/Controllers/Api/MethodesController.php:153
 * @route '/methods/temps-acceptes-detail'
 */
    const tempsAcceptesDetailForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: tempsAcceptesDetail.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\MethodesController::tempsAcceptesDetail
 * @see app/Http/Controllers/Api/MethodesController.php:153
 * @route '/methods/temps-acceptes-detail'
 */
        tempsAcceptesDetailForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: tempsAcceptesDetail.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\MethodesController::tempsAcceptesDetail
 * @see app/Http/Controllers/Api/MethodesController.php:153
 * @route '/methods/temps-acceptes-detail'
 */
        tempsAcceptesDetailForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: tempsAcceptesDetail.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    tempsAcceptesDetail.form = tempsAcceptesDetailForm
/**
* @see \App\Http\Controllers\Api\MethodesController::fiabiliteDetail
 * @see app/Http/Controllers/Api/MethodesController.php:167
 * @route '/methods/fiabilite-detail'
 */
export const fiabiliteDetail = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: fiabiliteDetail.url(options),
    method: 'get',
})

fiabiliteDetail.definition = {
    methods: ["get","head"],
    url: '/methods/fiabilite-detail',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\MethodesController::fiabiliteDetail
 * @see app/Http/Controllers/Api/MethodesController.php:167
 * @route '/methods/fiabilite-detail'
 */
fiabiliteDetail.url = (options?: RouteQueryOptions) => {
    return fiabiliteDetail.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\MethodesController::fiabiliteDetail
 * @see app/Http/Controllers/Api/MethodesController.php:167
 * @route '/methods/fiabilite-detail'
 */
fiabiliteDetail.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: fiabiliteDetail.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\MethodesController::fiabiliteDetail
 * @see app/Http/Controllers/Api/MethodesController.php:167
 * @route '/methods/fiabilite-detail'
 */
fiabiliteDetail.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: fiabiliteDetail.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\MethodesController::fiabiliteDetail
 * @see app/Http/Controllers/Api/MethodesController.php:167
 * @route '/methods/fiabilite-detail'
 */
    const fiabiliteDetailForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: fiabiliteDetail.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\MethodesController::fiabiliteDetail
 * @see app/Http/Controllers/Api/MethodesController.php:167
 * @route '/methods/fiabilite-detail'
 */
        fiabiliteDetailForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: fiabiliteDetail.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\MethodesController::fiabiliteDetail
 * @see app/Http/Controllers/Api/MethodesController.php:167
 * @route '/methods/fiabilite-detail'
 */
        fiabiliteDetailForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: fiabiliteDetail.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    fiabiliteDetail.form = fiabiliteDetailForm
const MethodesController = { kpis, archivageDetail, respectTempsDetail, tempsAcceptesDetail, fiabiliteDetail }

export default MethodesController