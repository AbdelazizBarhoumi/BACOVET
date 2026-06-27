import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\ProductionController::chainInfo
 * @see app/Http/Controllers/Api/ProductionController.php:57
 * @route '/production/chain-info'
 */
export const chainInfo = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: chainInfo.url(options),
    method: 'get',
})

chainInfo.definition = {
    methods: ["get","head"],
    url: '/production/chain-info',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::chainInfo
 * @see app/Http/Controllers/Api/ProductionController.php:57
 * @route '/production/chain-info'
 */
chainInfo.url = (options?: RouteQueryOptions) => {
    return chainInfo.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::chainInfo
 * @see app/Http/Controllers/Api/ProductionController.php:57
 * @route '/production/chain-info'
 */
chainInfo.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: chainInfo.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::chainInfo
 * @see app/Http/Controllers/Api/ProductionController.php:57
 * @route '/production/chain-info'
 */
chainInfo.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: chainInfo.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::chainInfo
 * @see app/Http/Controllers/Api/ProductionController.php:57
 * @route '/production/chain-info'
 */
    const chainInfoForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: chainInfo.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::chainInfo
 * @see app/Http/Controllers/Api/ProductionController.php:57
 * @route '/production/chain-info'
 */
        chainInfoForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: chainInfo.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::chainInfo
 * @see app/Http/Controllers/Api/ProductionController.php:57
 * @route '/production/chain-info'
 */
        chainInfoForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: chainInfo.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    chainInfo.form = chainInfoForm
/**
* @see \App\Http\Controllers\Api\ProductionController::kpis
 * @see app/Http/Controllers/Api/ProductionController.php:174
 * @route '/production/kpis'
 */
export const kpis = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})

kpis.definition = {
    methods: ["get","head"],
    url: '/production/kpis',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::kpis
 * @see app/Http/Controllers/Api/ProductionController.php:174
 * @route '/production/kpis'
 */
kpis.url = (options?: RouteQueryOptions) => {
    return kpis.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::kpis
 * @see app/Http/Controllers/Api/ProductionController.php:174
 * @route '/production/kpis'
 */
kpis.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::kpis
 * @see app/Http/Controllers/Api/ProductionController.php:174
 * @route '/production/kpis'
 */
kpis.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: kpis.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::kpis
 * @see app/Http/Controllers/Api/ProductionController.php:174
 * @route '/production/kpis'
 */
    const kpisForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: kpis.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::kpis
 * @see app/Http/Controllers/Api/ProductionController.php:174
 * @route '/production/kpis'
 */
        kpisForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: kpis.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::kpis
 * @see app/Http/Controllers/Api/ProductionController.php:174
 * @route '/production/kpis'
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
* @see \App\Http\Controllers\Api\ProductionController::efficienceGauges
 * @see app/Http/Controllers/Api/ProductionController.php:356
 * @route '/production/efficience-gauges'
 */
export const efficienceGauges = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: efficienceGauges.url(options),
    method: 'get',
})

efficienceGauges.definition = {
    methods: ["get","head"],
    url: '/production/efficience-gauges',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::efficienceGauges
 * @see app/Http/Controllers/Api/ProductionController.php:356
 * @route '/production/efficience-gauges'
 */
efficienceGauges.url = (options?: RouteQueryOptions) => {
    return efficienceGauges.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::efficienceGauges
 * @see app/Http/Controllers/Api/ProductionController.php:356
 * @route '/production/efficience-gauges'
 */
efficienceGauges.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: efficienceGauges.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::efficienceGauges
 * @see app/Http/Controllers/Api/ProductionController.php:356
 * @route '/production/efficience-gauges'
 */
efficienceGauges.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: efficienceGauges.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::efficienceGauges
 * @see app/Http/Controllers/Api/ProductionController.php:356
 * @route '/production/efficience-gauges'
 */
    const efficienceGaugesForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: efficienceGauges.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::efficienceGauges
 * @see app/Http/Controllers/Api/ProductionController.php:356
 * @route '/production/efficience-gauges'
 */
        efficienceGaugesForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: efficienceGauges.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::efficienceGauges
 * @see app/Http/Controllers/Api/ProductionController.php:356
 * @route '/production/efficience-gauges'
 */
        efficienceGaugesForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: efficienceGauges.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    efficienceGauges.form = efficienceGaugesForm
/**
* @see \App\Http\Controllers\Api\ProductionController::wipGauges
 * @see app/Http/Controllers/Api/ProductionController.php:368
 * @route '/production/wip-gauges'
 */
export const wipGauges = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: wipGauges.url(options),
    method: 'get',
})

wipGauges.definition = {
    methods: ["get","head"],
    url: '/production/wip-gauges',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::wipGauges
 * @see app/Http/Controllers/Api/ProductionController.php:368
 * @route '/production/wip-gauges'
 */
wipGauges.url = (options?: RouteQueryOptions) => {
    return wipGauges.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::wipGauges
 * @see app/Http/Controllers/Api/ProductionController.php:368
 * @route '/production/wip-gauges'
 */
wipGauges.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: wipGauges.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::wipGauges
 * @see app/Http/Controllers/Api/ProductionController.php:368
 * @route '/production/wip-gauges'
 */
wipGauges.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: wipGauges.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::wipGauges
 * @see app/Http/Controllers/Api/ProductionController.php:368
 * @route '/production/wip-gauges'
 */
    const wipGaugesForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: wipGauges.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::wipGauges
 * @see app/Http/Controllers/Api/ProductionController.php:368
 * @route '/production/wip-gauges'
 */
        wipGaugesForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: wipGauges.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::wipGauges
 * @see app/Http/Controllers/Api/ProductionController.php:368
 * @route '/production/wip-gauges'
 */
        wipGaugesForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: wipGauges.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    wipGauges.form = wipGaugesForm
/**
* @see \App\Http\Controllers\Api\ProductionController::stoppageTimeline
 * @see app/Http/Controllers/Api/ProductionController.php:388
 * @route '/production/stoppage-timeline'
 */
export const stoppageTimeline = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stoppageTimeline.url(options),
    method: 'get',
})

stoppageTimeline.definition = {
    methods: ["get","head"],
    url: '/production/stoppage-timeline',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::stoppageTimeline
 * @see app/Http/Controllers/Api/ProductionController.php:388
 * @route '/production/stoppage-timeline'
 */
stoppageTimeline.url = (options?: RouteQueryOptions) => {
    return stoppageTimeline.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::stoppageTimeline
 * @see app/Http/Controllers/Api/ProductionController.php:388
 * @route '/production/stoppage-timeline'
 */
stoppageTimeline.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: stoppageTimeline.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::stoppageTimeline
 * @see app/Http/Controllers/Api/ProductionController.php:388
 * @route '/production/stoppage-timeline'
 */
stoppageTimeline.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: stoppageTimeline.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::stoppageTimeline
 * @see app/Http/Controllers/Api/ProductionController.php:388
 * @route '/production/stoppage-timeline'
 */
    const stoppageTimelineForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: stoppageTimeline.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::stoppageTimeline
 * @see app/Http/Controllers/Api/ProductionController.php:388
 * @route '/production/stoppage-timeline'
 */
        stoppageTimelineForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stoppageTimeline.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::stoppageTimeline
 * @see app/Http/Controllers/Api/ProductionController.php:388
 * @route '/production/stoppage-timeline'
 */
        stoppageTimelineForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: stoppageTimeline.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    stoppageTimeline.form = stoppageTimelineForm
/**
* @see \App\Http\Controllers\Api\ProductionController::ofDonuts
 * @see app/Http/Controllers/Api/ProductionController.php:407
 * @route '/production/of-donuts'
 */
export const ofDonuts = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: ofDonuts.url(options),
    method: 'get',
})

ofDonuts.definition = {
    methods: ["get","head"],
    url: '/production/of-donuts',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::ofDonuts
 * @see app/Http/Controllers/Api/ProductionController.php:407
 * @route '/production/of-donuts'
 */
ofDonuts.url = (options?: RouteQueryOptions) => {
    return ofDonuts.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::ofDonuts
 * @see app/Http/Controllers/Api/ProductionController.php:407
 * @route '/production/of-donuts'
 */
ofDonuts.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: ofDonuts.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::ofDonuts
 * @see app/Http/Controllers/Api/ProductionController.php:407
 * @route '/production/of-donuts'
 */
ofDonuts.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: ofDonuts.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::ofDonuts
 * @see app/Http/Controllers/Api/ProductionController.php:407
 * @route '/production/of-donuts'
 */
    const ofDonutsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: ofDonuts.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::ofDonuts
 * @see app/Http/Controllers/Api/ProductionController.php:407
 * @route '/production/of-donuts'
 */
        ofDonutsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: ofDonuts.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::ofDonuts
 * @see app/Http/Controllers/Api/ProductionController.php:407
 * @route '/production/of-donuts'
 */
        ofDonutsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: ofDonuts.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    ofDonuts.form = ofDonutsForm
/**
* @see \App\Http\Controllers\Api\ProductionController::efficienceTrend
 * @see app/Http/Controllers/Api/ProductionController.php:430
 * @route '/production/efficience-trend'
 */
export const efficienceTrend = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: efficienceTrend.url(options),
    method: 'get',
})

efficienceTrend.definition = {
    methods: ["get","head"],
    url: '/production/efficience-trend',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::efficienceTrend
 * @see app/Http/Controllers/Api/ProductionController.php:430
 * @route '/production/efficience-trend'
 */
efficienceTrend.url = (options?: RouteQueryOptions) => {
    return efficienceTrend.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::efficienceTrend
 * @see app/Http/Controllers/Api/ProductionController.php:430
 * @route '/production/efficience-trend'
 */
efficienceTrend.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: efficienceTrend.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::efficienceTrend
 * @see app/Http/Controllers/Api/ProductionController.php:430
 * @route '/production/efficience-trend'
 */
efficienceTrend.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: efficienceTrend.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::efficienceTrend
 * @see app/Http/Controllers/Api/ProductionController.php:430
 * @route '/production/efficience-trend'
 */
    const efficienceTrendForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: efficienceTrend.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::efficienceTrend
 * @see app/Http/Controllers/Api/ProductionController.php:430
 * @route '/production/efficience-trend'
 */
        efficienceTrendForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: efficienceTrend.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::efficienceTrend
 * @see app/Http/Controllers/Api/ProductionController.php:430
 * @route '/production/efficience-trend'
 */
        efficienceTrendForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: efficienceTrend.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    efficienceTrend.form = efficienceTrendForm
/**
* @see \App\Http\Controllers\Api\ProductionController::topOperators
 * @see app/Http/Controllers/Api/ProductionController.php:467
 * @route '/production/top-operators'
 */
export const topOperators = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: topOperators.url(options),
    method: 'get',
})

topOperators.definition = {
    methods: ["get","head"],
    url: '/production/top-operators',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::topOperators
 * @see app/Http/Controllers/Api/ProductionController.php:467
 * @route '/production/top-operators'
 */
topOperators.url = (options?: RouteQueryOptions) => {
    return topOperators.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::topOperators
 * @see app/Http/Controllers/Api/ProductionController.php:467
 * @route '/production/top-operators'
 */
topOperators.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: topOperators.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::topOperators
 * @see app/Http/Controllers/Api/ProductionController.php:467
 * @route '/production/top-operators'
 */
topOperators.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: topOperators.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::topOperators
 * @see app/Http/Controllers/Api/ProductionController.php:467
 * @route '/production/top-operators'
 */
    const topOperatorsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: topOperators.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::topOperators
 * @see app/Http/Controllers/Api/ProductionController.php:467
 * @route '/production/top-operators'
 */
        topOperatorsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: topOperators.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::topOperators
 * @see app/Http/Controllers/Api/ProductionController.php:467
 * @route '/production/top-operators'
 */
        topOperatorsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: topOperators.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    topOperators.form = topOperatorsForm
/**
* @see \App\Http\Controllers\Api\ProductionController::wip
 * @see app/Http/Controllers/Api/ProductionController.php:514
 * @route '/production/wip'
 */
export const wip = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: wip.url(options),
    method: 'get',
})

wip.definition = {
    methods: ["get","head"],
    url: '/production/wip',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::wip
 * @see app/Http/Controllers/Api/ProductionController.php:514
 * @route '/production/wip'
 */
wip.url = (options?: RouteQueryOptions) => {
    return wip.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::wip
 * @see app/Http/Controllers/Api/ProductionController.php:514
 * @route '/production/wip'
 */
wip.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: wip.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::wip
 * @see app/Http/Controllers/Api/ProductionController.php:514
 * @route '/production/wip'
 */
wip.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: wip.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::wip
 * @see app/Http/Controllers/Api/ProductionController.php:514
 * @route '/production/wip'
 */
    const wipForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: wip.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::wip
 * @see app/Http/Controllers/Api/ProductionController.php:514
 * @route '/production/wip'
 */
        wipForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: wip.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::wip
 * @see app/Http/Controllers/Api/ProductionController.php:514
 * @route '/production/wip'
 */
        wipForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: wip.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    wip.form = wipForm
/**
* @see \App\Http\Controllers\Api\ProductionController::soProgress
 * @see app/Http/Controllers/Api/ProductionController.php:563
 * @route '/production/so-progress'
 */
export const soProgress = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: soProgress.url(options),
    method: 'get',
})

soProgress.definition = {
    methods: ["get","head"],
    url: '/production/so-progress',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::soProgress
 * @see app/Http/Controllers/Api/ProductionController.php:563
 * @route '/production/so-progress'
 */
soProgress.url = (options?: RouteQueryOptions) => {
    return soProgress.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::soProgress
 * @see app/Http/Controllers/Api/ProductionController.php:563
 * @route '/production/so-progress'
 */
soProgress.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: soProgress.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::soProgress
 * @see app/Http/Controllers/Api/ProductionController.php:563
 * @route '/production/so-progress'
 */
soProgress.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: soProgress.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::soProgress
 * @see app/Http/Controllers/Api/ProductionController.php:563
 * @route '/production/so-progress'
 */
    const soProgressForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: soProgress.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::soProgress
 * @see app/Http/Controllers/Api/ProductionController.php:563
 * @route '/production/so-progress'
 */
        soProgressForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: soProgress.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::soProgress
 * @see app/Http/Controllers/Api/ProductionController.php:563
 * @route '/production/so-progress'
 */
        soProgressForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: soProgress.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    soProgress.form = soProgressForm
/**
* @see \App\Http\Controllers\Api\ProductionController::orderTracking
 * @see app/Http/Controllers/Api/ProductionController.php:1297
 * @route '/production/order-tracking'
 */
export const orderTracking = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: orderTracking.url(options),
    method: 'get',
})

orderTracking.definition = {
    methods: ["get","head"],
    url: '/production/order-tracking',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::orderTracking
 * @see app/Http/Controllers/Api/ProductionController.php:1297
 * @route '/production/order-tracking'
 */
orderTracking.url = (options?: RouteQueryOptions) => {
    return orderTracking.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::orderTracking
 * @see app/Http/Controllers/Api/ProductionController.php:1297
 * @route '/production/order-tracking'
 */
orderTracking.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: orderTracking.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::orderTracking
 * @see app/Http/Controllers/Api/ProductionController.php:1297
 * @route '/production/order-tracking'
 */
orderTracking.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: orderTracking.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::orderTracking
 * @see app/Http/Controllers/Api/ProductionController.php:1297
 * @route '/production/order-tracking'
 */
    const orderTrackingForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: orderTracking.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::orderTracking
 * @see app/Http/Controllers/Api/ProductionController.php:1297
 * @route '/production/order-tracking'
 */
        orderTrackingForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: orderTracking.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::orderTracking
 * @see app/Http/Controllers/Api/ProductionController.php:1297
 * @route '/production/order-tracking'
 */
        orderTrackingForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: orderTracking.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    orderTracking.form = orderTrackingForm
/**
* @see \App\Http\Controllers\Api\ProductionController::breakdown
 * @see app/Http/Controllers/Api/ProductionController.php:582
 * @route '/production/breakdown/{kpiKey}'
 */
export const breakdown = (args: { kpiKey: string | number } | [kpiKey: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: breakdown.url(args, options),
    method: 'get',
})

breakdown.definition = {
    methods: ["get","head"],
    url: '/production/breakdown/{kpiKey}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::breakdown
 * @see app/Http/Controllers/Api/ProductionController.php:582
 * @route '/production/breakdown/{kpiKey}'
 */
breakdown.url = (args: { kpiKey: string | number } | [kpiKey: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { kpiKey: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    kpiKey: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        kpiKey: args.kpiKey,
                }

    return breakdown.definition.url
            .replace('{kpiKey}', parsedArgs.kpiKey.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::breakdown
 * @see app/Http/Controllers/Api/ProductionController.php:582
 * @route '/production/breakdown/{kpiKey}'
 */
breakdown.get = (args: { kpiKey: string | number } | [kpiKey: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: breakdown.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::breakdown
 * @see app/Http/Controllers/Api/ProductionController.php:582
 * @route '/production/breakdown/{kpiKey}'
 */
breakdown.head = (args: { kpiKey: string | number } | [kpiKey: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: breakdown.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::breakdown
 * @see app/Http/Controllers/Api/ProductionController.php:582
 * @route '/production/breakdown/{kpiKey}'
 */
    const breakdownForm = (args: { kpiKey: string | number } | [kpiKey: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: breakdown.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::breakdown
 * @see app/Http/Controllers/Api/ProductionController.php:582
 * @route '/production/breakdown/{kpiKey}'
 */
        breakdownForm.get = (args: { kpiKey: string | number } | [kpiKey: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: breakdown.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::breakdown
 * @see app/Http/Controllers/Api/ProductionController.php:582
 * @route '/production/breakdown/{kpiKey}'
 */
        breakdownForm.head = (args: { kpiKey: string | number } | [kpiKey: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: breakdown.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    breakdown.form = breakdownForm
/**
* @see \App\Http\Controllers\Api\ProductionController::inlineEndline
 * @see app/Http/Controllers/Api/ProductionController.php:959
 * @route '/production/inline-endline'
 */
export const inlineEndline = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: inlineEndline.url(options),
    method: 'get',
})

inlineEndline.definition = {
    methods: ["get","head"],
    url: '/production/inline-endline',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::inlineEndline
 * @see app/Http/Controllers/Api/ProductionController.php:959
 * @route '/production/inline-endline'
 */
inlineEndline.url = (options?: RouteQueryOptions) => {
    return inlineEndline.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::inlineEndline
 * @see app/Http/Controllers/Api/ProductionController.php:959
 * @route '/production/inline-endline'
 */
inlineEndline.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: inlineEndline.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::inlineEndline
 * @see app/Http/Controllers/Api/ProductionController.php:959
 * @route '/production/inline-endline'
 */
inlineEndline.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: inlineEndline.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::inlineEndline
 * @see app/Http/Controllers/Api/ProductionController.php:959
 * @route '/production/inline-endline'
 */
    const inlineEndlineForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: inlineEndline.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::inlineEndline
 * @see app/Http/Controllers/Api/ProductionController.php:959
 * @route '/production/inline-endline'
 */
        inlineEndlineForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: inlineEndline.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::inlineEndline
 * @see app/Http/Controllers/Api/ProductionController.php:959
 * @route '/production/inline-endline'
 */
        inlineEndlineForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: inlineEndline.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    inlineEndline.form = inlineEndlineForm
/**
* @see \App\Http\Controllers\Api\ProductionController::tauxArchivage
 * @see app/Http/Controllers/Api/ProductionController.php:1246
 * @route '/production/taux-archivage'
 */
export const tauxArchivage = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: tauxArchivage.url(options),
    method: 'get',
})

tauxArchivage.definition = {
    methods: ["get","head"],
    url: '/production/taux-archivage',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::tauxArchivage
 * @see app/Http/Controllers/Api/ProductionController.php:1246
 * @route '/production/taux-archivage'
 */
tauxArchivage.url = (options?: RouteQueryOptions) => {
    return tauxArchivage.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::tauxArchivage
 * @see app/Http/Controllers/Api/ProductionController.php:1246
 * @route '/production/taux-archivage'
 */
tauxArchivage.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: tauxArchivage.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::tauxArchivage
 * @see app/Http/Controllers/Api/ProductionController.php:1246
 * @route '/production/taux-archivage'
 */
tauxArchivage.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: tauxArchivage.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::tauxArchivage
 * @see app/Http/Controllers/Api/ProductionController.php:1246
 * @route '/production/taux-archivage'
 */
    const tauxArchivageForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: tauxArchivage.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::tauxArchivage
 * @see app/Http/Controllers/Api/ProductionController.php:1246
 * @route '/production/taux-archivage'
 */
        tauxArchivageForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: tauxArchivage.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::tauxArchivage
 * @see app/Http/Controllers/Api/ProductionController.php:1246
 * @route '/production/taux-archivage'
 */
        tauxArchivageForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: tauxArchivage.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    tauxArchivage.form = tauxArchivageForm
/**
* @see \App\Http\Controllers\Api\ProductionController::respectTempsEstime
 * @see app/Http/Controllers/Api/ProductionController.php:1262
 * @route '/production/respect-temps-estime'
 */
export const respectTempsEstime = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: respectTempsEstime.url(options),
    method: 'get',
})

respectTempsEstime.definition = {
    methods: ["get","head"],
    url: '/production/respect-temps-estime',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::respectTempsEstime
 * @see app/Http/Controllers/Api/ProductionController.php:1262
 * @route '/production/respect-temps-estime'
 */
respectTempsEstime.url = (options?: RouteQueryOptions) => {
    return respectTempsEstime.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::respectTempsEstime
 * @see app/Http/Controllers/Api/ProductionController.php:1262
 * @route '/production/respect-temps-estime'
 */
respectTempsEstime.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: respectTempsEstime.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::respectTempsEstime
 * @see app/Http/Controllers/Api/ProductionController.php:1262
 * @route '/production/respect-temps-estime'
 */
respectTempsEstime.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: respectTempsEstime.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::respectTempsEstime
 * @see app/Http/Controllers/Api/ProductionController.php:1262
 * @route '/production/respect-temps-estime'
 */
    const respectTempsEstimeForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: respectTempsEstime.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::respectTempsEstime
 * @see app/Http/Controllers/Api/ProductionController.php:1262
 * @route '/production/respect-temps-estime'
 */
        respectTempsEstimeForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: respectTempsEstime.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::respectTempsEstime
 * @see app/Http/Controllers/Api/ProductionController.php:1262
 * @route '/production/respect-temps-estime'
 */
        respectTempsEstimeForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: respectTempsEstime.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    respectTempsEstime.form = respectTempsEstimeForm
/**
* @see \App\Http\Controllers\Api\ProductionController::tauxTempsAcceptes
 * @see app/Http/Controllers/Api/ProductionController.php:1278
 * @route '/production/taux-temps-acceptes'
 */
export const tauxTempsAcceptes = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: tauxTempsAcceptes.url(options),
    method: 'get',
})

tauxTempsAcceptes.definition = {
    methods: ["get","head"],
    url: '/production/taux-temps-acceptes',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::tauxTempsAcceptes
 * @see app/Http/Controllers/Api/ProductionController.php:1278
 * @route '/production/taux-temps-acceptes'
 */
tauxTempsAcceptes.url = (options?: RouteQueryOptions) => {
    return tauxTempsAcceptes.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::tauxTempsAcceptes
 * @see app/Http/Controllers/Api/ProductionController.php:1278
 * @route '/production/taux-temps-acceptes'
 */
tauxTempsAcceptes.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: tauxTempsAcceptes.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::tauxTempsAcceptes
 * @see app/Http/Controllers/Api/ProductionController.php:1278
 * @route '/production/taux-temps-acceptes'
 */
tauxTempsAcceptes.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: tauxTempsAcceptes.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::tauxTempsAcceptes
 * @see app/Http/Controllers/Api/ProductionController.php:1278
 * @route '/production/taux-temps-acceptes'
 */
    const tauxTempsAcceptesForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: tauxTempsAcceptes.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::tauxTempsAcceptes
 * @see app/Http/Controllers/Api/ProductionController.php:1278
 * @route '/production/taux-temps-acceptes'
 */
        tauxTempsAcceptesForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: tauxTempsAcceptes.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::tauxTempsAcceptes
 * @see app/Http/Controllers/Api/ProductionController.php:1278
 * @route '/production/taux-temps-acceptes'
 */
        tauxTempsAcceptesForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: tauxTempsAcceptes.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    tauxTempsAcceptes.form = tauxTempsAcceptesForm
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1019
 * @route '/production/coupe/coverage'
 */
export const coupeCoverage = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeCoverage.url(options),
    method: 'get',
})

coupeCoverage.definition = {
    methods: ["get","head"],
    url: '/production/coupe/coverage',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1019
 * @route '/production/coupe/coverage'
 */
coupeCoverage.url = (options?: RouteQueryOptions) => {
    return coupeCoverage.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1019
 * @route '/production/coupe/coverage'
 */
coupeCoverage.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeCoverage.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1019
 * @route '/production/coupe/coverage'
 */
coupeCoverage.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: coupeCoverage.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::coupeCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1019
 * @route '/production/coupe/coverage'
 */
    const coupeCoverageForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: coupeCoverage.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1019
 * @route '/production/coupe/coverage'
 */
        coupeCoverageForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeCoverage.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1019
 * @route '/production/coupe/coverage'
 */
        coupeCoverageForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeCoverage.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    coupeCoverage.form = coupeCoverageForm
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeChainCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1046
 * @route '/production/coupe/chain-coverage'
 */
export const coupeChainCoverage = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeChainCoverage.url(options),
    method: 'get',
})

coupeChainCoverage.definition = {
    methods: ["get","head"],
    url: '/production/coupe/chain-coverage',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeChainCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1046
 * @route '/production/coupe/chain-coverage'
 */
coupeChainCoverage.url = (options?: RouteQueryOptions) => {
    return coupeChainCoverage.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeChainCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1046
 * @route '/production/coupe/chain-coverage'
 */
coupeChainCoverage.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeChainCoverage.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeChainCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1046
 * @route '/production/coupe/chain-coverage'
 */
coupeChainCoverage.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: coupeChainCoverage.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::coupeChainCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1046
 * @route '/production/coupe/chain-coverage'
 */
    const coupeChainCoverageForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: coupeChainCoverage.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeChainCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1046
 * @route '/production/coupe/chain-coverage'
 */
        coupeChainCoverageForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeChainCoverage.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeChainCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1046
 * @route '/production/coupe/chain-coverage'
 */
        coupeChainCoverageForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeChainCoverage.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    coupeChainCoverage.form = coupeChainCoverageForm
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeTagging
 * @see app/Http/Controllers/Api/ProductionController.php:1090
 * @route '/production/coupe/tagging'
 */
export const coupeTagging = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeTagging.url(options),
    method: 'get',
})

coupeTagging.definition = {
    methods: ["get","head"],
    url: '/production/coupe/tagging',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeTagging
 * @see app/Http/Controllers/Api/ProductionController.php:1090
 * @route '/production/coupe/tagging'
 */
coupeTagging.url = (options?: RouteQueryOptions) => {
    return coupeTagging.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeTagging
 * @see app/Http/Controllers/Api/ProductionController.php:1090
 * @route '/production/coupe/tagging'
 */
coupeTagging.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeTagging.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeTagging
 * @see app/Http/Controllers/Api/ProductionController.php:1090
 * @route '/production/coupe/tagging'
 */
coupeTagging.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: coupeTagging.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::coupeTagging
 * @see app/Http/Controllers/Api/ProductionController.php:1090
 * @route '/production/coupe/tagging'
 */
    const coupeTaggingForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: coupeTagging.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeTagging
 * @see app/Http/Controllers/Api/ProductionController.php:1090
 * @route '/production/coupe/tagging'
 */
        coupeTaggingForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeTagging.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeTagging
 * @see app/Http/Controllers/Api/ProductionController.php:1090
 * @route '/production/coupe/tagging'
 */
        coupeTaggingForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeTagging.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    coupeTagging.form = coupeTaggingForm
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeOfs
 * @see app/Http/Controllers/Api/ProductionController.php:1101
 * @route '/production/coupe/ofs'
 */
export const coupeOfs = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeOfs.url(options),
    method: 'get',
})

coupeOfs.definition = {
    methods: ["get","head"],
    url: '/production/coupe/ofs',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeOfs
 * @see app/Http/Controllers/Api/ProductionController.php:1101
 * @route '/production/coupe/ofs'
 */
coupeOfs.url = (options?: RouteQueryOptions) => {
    return coupeOfs.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeOfs
 * @see app/Http/Controllers/Api/ProductionController.php:1101
 * @route '/production/coupe/ofs'
 */
coupeOfs.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeOfs.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeOfs
 * @see app/Http/Controllers/Api/ProductionController.php:1101
 * @route '/production/coupe/ofs'
 */
coupeOfs.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: coupeOfs.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::coupeOfs
 * @see app/Http/Controllers/Api/ProductionController.php:1101
 * @route '/production/coupe/ofs'
 */
    const coupeOfsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: coupeOfs.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeOfs
 * @see app/Http/Controllers/Api/ProductionController.php:1101
 * @route '/production/coupe/ofs'
 */
        coupeOfsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeOfs.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeOfs
 * @see app/Http/Controllers/Api/ProductionController.php:1101
 * @route '/production/coupe/ofs'
 */
        coupeOfsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeOfs.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    coupeOfs.form = coupeOfsForm
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1113
 * @route '/production/coupe/departage'
 */
export const coupeDepartage = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeDepartage.url(options),
    method: 'get',
})

coupeDepartage.definition = {
    methods: ["get","head"],
    url: '/production/coupe/departage',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1113
 * @route '/production/coupe/departage'
 */
coupeDepartage.url = (options?: RouteQueryOptions) => {
    return coupeDepartage.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1113
 * @route '/production/coupe/departage'
 */
coupeDepartage.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeDepartage.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1113
 * @route '/production/coupe/departage'
 */
coupeDepartage.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: coupeDepartage.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::coupeDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1113
 * @route '/production/coupe/departage'
 */
    const coupeDepartageForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: coupeDepartage.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1113
 * @route '/production/coupe/departage'
 */
        coupeDepartageForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeDepartage.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1113
 * @route '/production/coupe/departage'
 */
        coupeDepartageForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeDepartage.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    coupeDepartage.form = coupeDepartageForm
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeQteDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1219
 * @route '/production/coupe/qte-departage'
 */
export const coupeQteDepartage = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeQteDepartage.url(options),
    method: 'get',
})

coupeQteDepartage.definition = {
    methods: ["get","head"],
    url: '/production/coupe/qte-departage',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeQteDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1219
 * @route '/production/coupe/qte-departage'
 */
coupeQteDepartage.url = (options?: RouteQueryOptions) => {
    return coupeQteDepartage.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::coupeQteDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1219
 * @route '/production/coupe/qte-departage'
 */
coupeQteDepartage.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: coupeQteDepartage.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::coupeQteDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1219
 * @route '/production/coupe/qte-departage'
 */
coupeQteDepartage.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: coupeQteDepartage.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::coupeQteDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1219
 * @route '/production/coupe/qte-departage'
 */
    const coupeQteDepartageForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: coupeQteDepartage.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeQteDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1219
 * @route '/production/coupe/qte-departage'
 */
        coupeQteDepartageForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeQteDepartage.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::coupeQteDepartage
 * @see app/Http/Controllers/Api/ProductionController.php:1219
 * @route '/production/coupe/qte-departage'
 */
        coupeQteDepartageForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: coupeQteDepartage.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    coupeQteDepartage.form = coupeQteDepartageForm
/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1156
 * @route '/production/serigraphie/coverage'
 */
export const serigraphieCoverage = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: serigraphieCoverage.url(options),
    method: 'get',
})

serigraphieCoverage.definition = {
    methods: ["get","head"],
    url: '/production/serigraphie/coverage',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1156
 * @route '/production/serigraphie/coverage'
 */
serigraphieCoverage.url = (options?: RouteQueryOptions) => {
    return serigraphieCoverage.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1156
 * @route '/production/serigraphie/coverage'
 */
serigraphieCoverage.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: serigraphieCoverage.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1156
 * @route '/production/serigraphie/coverage'
 */
serigraphieCoverage.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: serigraphieCoverage.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1156
 * @route '/production/serigraphie/coverage'
 */
    const serigraphieCoverageForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: serigraphieCoverage.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1156
 * @route '/production/serigraphie/coverage'
 */
        serigraphieCoverageForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: serigraphieCoverage.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieCoverage
 * @see app/Http/Controllers/Api/ProductionController.php:1156
 * @route '/production/serigraphie/coverage'
 */
        serigraphieCoverageForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: serigraphieCoverage.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    serigraphieCoverage.form = serigraphieCoverageForm
/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieFlux
 * @see app/Http/Controllers/Api/ProductionController.php:1177
 * @route '/production/serigraphie/flux'
 */
export const serigraphieFlux = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: serigraphieFlux.url(options),
    method: 'get',
})

serigraphieFlux.definition = {
    methods: ["get","head"],
    url: '/production/serigraphie/flux',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieFlux
 * @see app/Http/Controllers/Api/ProductionController.php:1177
 * @route '/production/serigraphie/flux'
 */
serigraphieFlux.url = (options?: RouteQueryOptions) => {
    return serigraphieFlux.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieFlux
 * @see app/Http/Controllers/Api/ProductionController.php:1177
 * @route '/production/serigraphie/flux'
 */
serigraphieFlux.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: serigraphieFlux.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieFlux
 * @see app/Http/Controllers/Api/ProductionController.php:1177
 * @route '/production/serigraphie/flux'
 */
serigraphieFlux.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: serigraphieFlux.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieFlux
 * @see app/Http/Controllers/Api/ProductionController.php:1177
 * @route '/production/serigraphie/flux'
 */
    const serigraphieFluxForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: serigraphieFlux.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieFlux
 * @see app/Http/Controllers/Api/ProductionController.php:1177
 * @route '/production/serigraphie/flux'
 */
        serigraphieFluxForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: serigraphieFlux.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieFlux
 * @see app/Http/Controllers/Api/ProductionController.php:1177
 * @route '/production/serigraphie/flux'
 */
        serigraphieFluxForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: serigraphieFlux.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    serigraphieFlux.form = serigraphieFluxForm
/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieRejets
 * @see app/Http/Controllers/Api/ProductionController.php:1231
 * @route '/production/serigraphie/rejets'
 */
export const serigraphieRejets = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: serigraphieRejets.url(options),
    method: 'get',
})

serigraphieRejets.definition = {
    methods: ["get","head"],
    url: '/production/serigraphie/rejets',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieRejets
 * @see app/Http/Controllers/Api/ProductionController.php:1231
 * @route '/production/serigraphie/rejets'
 */
serigraphieRejets.url = (options?: RouteQueryOptions) => {
    return serigraphieRejets.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieRejets
 * @see app/Http/Controllers/Api/ProductionController.php:1231
 * @route '/production/serigraphie/rejets'
 */
serigraphieRejets.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: serigraphieRejets.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieRejets
 * @see app/Http/Controllers/Api/ProductionController.php:1231
 * @route '/production/serigraphie/rejets'
 */
serigraphieRejets.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: serigraphieRejets.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieRejets
 * @see app/Http/Controllers/Api/ProductionController.php:1231
 * @route '/production/serigraphie/rejets'
 */
    const serigraphieRejetsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: serigraphieRejets.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieRejets
 * @see app/Http/Controllers/Api/ProductionController.php:1231
 * @route '/production/serigraphie/rejets'
 */
        serigraphieRejetsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: serigraphieRejets.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\ProductionController::serigraphieRejets
 * @see app/Http/Controllers/Api/ProductionController.php:1231
 * @route '/production/serigraphie/rejets'
 */
        serigraphieRejetsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: serigraphieRejets.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    serigraphieRejets.form = serigraphieRejetsForm
const ProductionController = { chainInfo, kpis, efficienceGauges, wipGauges, stoppageTimeline, ofDonuts, efficienceTrend, topOperators, wip, soProgress, orderTracking, breakdown, inlineEndline, tauxArchivage, respectTempsEstime, tauxTempsAcceptes, coupeCoverage, coupeChainCoverage, coupeTagging, coupeOfs, coupeDepartage, coupeQteDepartage, serigraphieCoverage, serigraphieFlux, serigraphieRejets }

export default ProductionController