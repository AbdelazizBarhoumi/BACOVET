import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\QualityController::kpis
 * @see app/Http/Controllers/Api/QualityController.php:21
 * @route '/quality/kpis'
 */
export const kpis = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})

kpis.definition = {
    methods: ["get","head"],
    url: '/quality/kpis',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\QualityController::kpis
 * @see app/Http/Controllers/Api/QualityController.php:21
 * @route '/quality/kpis'
 */
kpis.url = (options?: RouteQueryOptions) => {
    return kpis.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\QualityController::kpis
 * @see app/Http/Controllers/Api/QualityController.php:21
 * @route '/quality/kpis'
 */
kpis.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: kpis.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\QualityController::kpis
 * @see app/Http/Controllers/Api/QualityController.php:21
 * @route '/quality/kpis'
 */
kpis.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: kpis.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\QualityController::kpis
 * @see app/Http/Controllers/Api/QualityController.php:21
 * @route '/quality/kpis'
 */
    const kpisForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: kpis.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\QualityController::kpis
 * @see app/Http/Controllers/Api/QualityController.php:21
 * @route '/quality/kpis'
 */
        kpisForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: kpis.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\QualityController::kpis
 * @see app/Http/Controllers/Api/QualityController.php:21
 * @route '/quality/kpis'
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
* @see \App\Http\Controllers\Api\QualityController::defectChart
 * @see app/Http/Controllers/Api/QualityController.php:156
 * @route '/quality/defect-chart'
 */
export const defectChart = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: defectChart.url(options),
    method: 'get',
})

defectChart.definition = {
    methods: ["get","head"],
    url: '/quality/defect-chart',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\QualityController::defectChart
 * @see app/Http/Controllers/Api/QualityController.php:156
 * @route '/quality/defect-chart'
 */
defectChart.url = (options?: RouteQueryOptions) => {
    return defectChart.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\QualityController::defectChart
 * @see app/Http/Controllers/Api/QualityController.php:156
 * @route '/quality/defect-chart'
 */
defectChart.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: defectChart.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\QualityController::defectChart
 * @see app/Http/Controllers/Api/QualityController.php:156
 * @route '/quality/defect-chart'
 */
defectChart.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: defectChart.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\QualityController::defectChart
 * @see app/Http/Controllers/Api/QualityController.php:156
 * @route '/quality/defect-chart'
 */
    const defectChartForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: defectChart.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\QualityController::defectChart
 * @see app/Http/Controllers/Api/QualityController.php:156
 * @route '/quality/defect-chart'
 */
        defectChartForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: defectChart.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\QualityController::defectChart
 * @see app/Http/Controllers/Api/QualityController.php:156
 * @route '/quality/defect-chart'
 */
        defectChartForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: defectChart.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    defectChart.form = defectChartForm
/**
* @see \App\Http\Controllers\Api\QualityController::qpTeams
 * @see app/Http/Controllers/Api/QualityController.php:171
 * @route '/quality/qp-teams'
 */
export const qpTeams = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: qpTeams.url(options),
    method: 'get',
})

qpTeams.definition = {
    methods: ["get","head"],
    url: '/quality/qp-teams',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\QualityController::qpTeams
 * @see app/Http/Controllers/Api/QualityController.php:171
 * @route '/quality/qp-teams'
 */
qpTeams.url = (options?: RouteQueryOptions) => {
    return qpTeams.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\QualityController::qpTeams
 * @see app/Http/Controllers/Api/QualityController.php:171
 * @route '/quality/qp-teams'
 */
qpTeams.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: qpTeams.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\QualityController::qpTeams
 * @see app/Http/Controllers/Api/QualityController.php:171
 * @route '/quality/qp-teams'
 */
qpTeams.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: qpTeams.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\QualityController::qpTeams
 * @see app/Http/Controllers/Api/QualityController.php:171
 * @route '/quality/qp-teams'
 */
    const qpTeamsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: qpTeams.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\QualityController::qpTeams
 * @see app/Http/Controllers/Api/QualityController.php:171
 * @route '/quality/qp-teams'
 */
        qpTeamsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: qpTeams.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\QualityController::qpTeams
 * @see app/Http/Controllers/Api/QualityController.php:171
 * @route '/quality/qp-teams'
 */
        qpTeamsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: qpTeams.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    qpTeams.form = qpTeamsForm
/**
* @see \App\Http\Controllers\Api\QualityController::annualTrend
 * @see app/Http/Controllers/Api/QualityController.php:233
 * @route '/quality/annual-trend'
 */
export const annualTrend = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: annualTrend.url(options),
    method: 'get',
})

annualTrend.definition = {
    methods: ["get","head"],
    url: '/quality/annual-trend',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\QualityController::annualTrend
 * @see app/Http/Controllers/Api/QualityController.php:233
 * @route '/quality/annual-trend'
 */
annualTrend.url = (options?: RouteQueryOptions) => {
    return annualTrend.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\QualityController::annualTrend
 * @see app/Http/Controllers/Api/QualityController.php:233
 * @route '/quality/annual-trend'
 */
annualTrend.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: annualTrend.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\QualityController::annualTrend
 * @see app/Http/Controllers/Api/QualityController.php:233
 * @route '/quality/annual-trend'
 */
annualTrend.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: annualTrend.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\QualityController::annualTrend
 * @see app/Http/Controllers/Api/QualityController.php:233
 * @route '/quality/annual-trend'
 */
    const annualTrendForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: annualTrend.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\QualityController::annualTrend
 * @see app/Http/Controllers/Api/QualityController.php:233
 * @route '/quality/annual-trend'
 */
        annualTrendForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: annualTrend.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\QualityController::annualTrend
 * @see app/Http/Controllers/Api/QualityController.php:233
 * @route '/quality/annual-trend'
 */
        annualTrendForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: annualTrend.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    annualTrend.form = annualTrendForm
/**
* @see \App\Http\Controllers\Api\QualityController::paretoRft
 * @see app/Http/Controllers/Api/QualityController.php:343
 * @route '/quality/pareto/rft'
 */
export const paretoRft = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: paretoRft.url(options),
    method: 'get',
})

paretoRft.definition = {
    methods: ["get","head"],
    url: '/quality/pareto/rft',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\QualityController::paretoRft
 * @see app/Http/Controllers/Api/QualityController.php:343
 * @route '/quality/pareto/rft'
 */
paretoRft.url = (options?: RouteQueryOptions) => {
    return paretoRft.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\QualityController::paretoRft
 * @see app/Http/Controllers/Api/QualityController.php:343
 * @route '/quality/pareto/rft'
 */
paretoRft.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: paretoRft.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\QualityController::paretoRft
 * @see app/Http/Controllers/Api/QualityController.php:343
 * @route '/quality/pareto/rft'
 */
paretoRft.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: paretoRft.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\QualityController::paretoRft
 * @see app/Http/Controllers/Api/QualityController.php:343
 * @route '/quality/pareto/rft'
 */
    const paretoRftForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: paretoRft.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\QualityController::paretoRft
 * @see app/Http/Controllers/Api/QualityController.php:343
 * @route '/quality/pareto/rft'
 */
        paretoRftForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: paretoRft.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\QualityController::paretoRft
 * @see app/Http/Controllers/Api/QualityController.php:343
 * @route '/quality/pareto/rft'
 */
        paretoRftForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: paretoRft.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    paretoRft.form = paretoRftForm
/**
* @see \App\Http\Controllers\Api\QualityController::paretoInspection
 * @see app/Http/Controllers/Api/QualityController.php:368
 * @route '/quality/pareto/inspection'
 */
export const paretoInspection = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: paretoInspection.url(options),
    method: 'get',
})

paretoInspection.definition = {
    methods: ["get","head"],
    url: '/quality/pareto/inspection',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\QualityController::paretoInspection
 * @see app/Http/Controllers/Api/QualityController.php:368
 * @route '/quality/pareto/inspection'
 */
paretoInspection.url = (options?: RouteQueryOptions) => {
    return paretoInspection.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\QualityController::paretoInspection
 * @see app/Http/Controllers/Api/QualityController.php:368
 * @route '/quality/pareto/inspection'
 */
paretoInspection.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: paretoInspection.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\QualityController::paretoInspection
 * @see app/Http/Controllers/Api/QualityController.php:368
 * @route '/quality/pareto/inspection'
 */
paretoInspection.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: paretoInspection.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\QualityController::paretoInspection
 * @see app/Http/Controllers/Api/QualityController.php:368
 * @route '/quality/pareto/inspection'
 */
    const paretoInspectionForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: paretoInspection.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\QualityController::paretoInspection
 * @see app/Http/Controllers/Api/QualityController.php:368
 * @route '/quality/pareto/inspection'
 */
        paretoInspectionForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: paretoInspection.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\QualityController::paretoInspection
 * @see app/Http/Controllers/Api/QualityController.php:368
 * @route '/quality/pareto/inspection'
 */
        paretoInspectionForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: paretoInspection.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    paretoInspection.form = paretoInspectionForm
const QualityController = { kpis, defectChart, qpTeams, annualTrend, paretoRft, paretoInspection }

export default QualityController