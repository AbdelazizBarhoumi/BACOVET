import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::image
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:287
 * @route '/api/v5/builder-pages/{id}/images/{filename}'
 */
export const image = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: image.url(args, options),
    method: 'get',
})

image.definition = {
    methods: ["get","head"],
    url: '/api/v5/builder-pages/{id}/images/{filename}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::image
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:287
 * @route '/api/v5/builder-pages/{id}/images/{filename}'
 */
image.url = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
                    id: args[0],
                    filename: args[1],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        id: args.id,
                                filename: args.filename,
                }

    return image.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace('{filename}', parsedArgs.filename.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::image
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:287
 * @route '/api/v5/builder-pages/{id}/images/{filename}'
 */
image.get = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: image.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::image
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:287
 * @route '/api/v5/builder-pages/{id}/images/{filename}'
 */
image.head = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: image.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::image
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:287
 * @route '/api/v5/builder-pages/{id}/images/{filename}'
 */
    const imageForm = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: image.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::image
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:287
 * @route '/api/v5/builder-pages/{id}/images/{filename}'
 */
        imageForm.get = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: image.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\BuilderPageV5Controller::image
 * @see app/Http/Controllers/Api/BuilderPageV5Controller.php:287
 * @route '/api/v5/builder-pages/{id}/images/{filename}'
 */
        imageForm.head = (args: { id: string | number, filename: string | number } | [id: string | number, filename: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: image.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    image.form = imageForm
const page = {
    image: Object.assign(image, image),
}

export default page