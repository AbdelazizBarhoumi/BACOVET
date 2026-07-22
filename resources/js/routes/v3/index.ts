import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../wayfinder'
/**
 * @see routes/web.php:49
 * @route '/p/{slug}'
 */
export const page = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: page.url(args, options),
    method: 'get',
})

page.definition = {
    methods: ["get","head"],
    url: '/p/{slug}',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:49
 * @route '/p/{slug}'
 */
page.url = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return page.definition.url
            .replace('{slug}', parsedArgs.slug.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
 * @see routes/web.php:49
 * @route '/p/{slug}'
 */
page.get = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: page.url(args, options),
    method: 'get',
})
/**
 * @see routes/web.php:49
 * @route '/p/{slug}'
 */
page.head = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: page.url(args, options),
    method: 'head',
})

    /**
 * @see routes/web.php:49
 * @route '/p/{slug}'
 */
    const pageForm = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: page.url(args, options),
        method: 'get',
    })

            /**
 * @see routes/web.php:49
 * @route '/p/{slug}'
 */
        pageForm.get = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: page.url(args, options),
            method: 'get',
        })
            /**
 * @see routes/web.php:49
 * @route '/p/{slug}'
 */
        pageForm.head = (args: { slug: string | number } | [slug: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: page.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    page.form = pageForm
const v3 = {
    page: Object.assign(page, page),
}

export default v3