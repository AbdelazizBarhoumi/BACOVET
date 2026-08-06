import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::upload
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:258
 * @route '/api/v5/builder-pages/{id}/images'
 */
export const upload = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: upload.url(args, options),
    method: 'post',
})

upload.definition = {
    methods: ["post"],
    url: '/api/v5/builder-pages/{id}/images',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::upload
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:258
 * @route '/api/v5/builder-pages/{id}/images'
 */
upload.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return upload.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::upload
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:258
 * @route '/api/v5/builder-pages/{id}/images'
 */
upload.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: upload.url(args, options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::upload
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:258
 * @route '/api/v5/builder-pages/{id}/images'
 */
    const uploadForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: upload.url(args, options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::upload
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:258
 * @route '/api/v5/builder-pages/{id}/images'
 */
        uploadForm.post = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: upload.url(args, options),
            method: 'post',
        })
    
    upload.form = uploadForm