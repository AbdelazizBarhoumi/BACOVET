import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\DataAuthController::login
 * @see app/Http/Controllers/Api/DataAuthController.php:57
 * @route '/api/data-auth/login'
 */
export const login = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: login.url(options),
    method: 'post',
})

login.definition = {
    methods: ["post"],
    url: '/api/data-auth/login',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\DataAuthController::login
 * @see app/Http/Controllers/Api/DataAuthController.php:57
 * @route '/api/data-auth/login'
 */
login.url = (options?: RouteQueryOptions) => {
    return login.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataAuthController::login
 * @see app/Http/Controllers/Api/DataAuthController.php:57
 * @route '/api/data-auth/login'
 */
login.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: login.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\DataAuthController::login
 * @see app/Http/Controllers/Api/DataAuthController.php:57
 * @route '/api/data-auth/login'
 */
    const loginForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: login.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\DataAuthController::login
 * @see app/Http/Controllers/Api/DataAuthController.php:57
 * @route '/api/data-auth/login'
 */
        loginForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: login.url(options),
            method: 'post',
        })
    
    login.form = loginForm
/**
* @see \App\Http\Controllers\Api\DataAuthController::check
 * @see app/Http/Controllers/Api/DataAuthController.php:13
 * @route '/api/data-auth/check'
 */
export const check = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: check.url(options),
    method: 'post',
})

check.definition = {
    methods: ["post"],
    url: '/api/data-auth/check',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\DataAuthController::check
 * @see app/Http/Controllers/Api/DataAuthController.php:13
 * @route '/api/data-auth/check'
 */
check.url = (options?: RouteQueryOptions) => {
    return check.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataAuthController::check
 * @see app/Http/Controllers/Api/DataAuthController.php:13
 * @route '/api/data-auth/check'
 */
check.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: check.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\DataAuthController::check
 * @see app/Http/Controllers/Api/DataAuthController.php:13
 * @route '/api/data-auth/check'
 */
    const checkForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: check.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\DataAuthController::check
 * @see app/Http/Controllers/Api/DataAuthController.php:13
 * @route '/api/data-auth/check'
 */
        checkForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: check.url(options),
            method: 'post',
        })
    
    check.form = checkForm
/**
* @see \App\Http\Controllers\Api\DataAuthController::setPassword
 * @see app/Http/Controllers/Api/DataAuthController.php:29
 * @route '/api/data-auth/set-password'
 */
export const setPassword = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: setPassword.url(options),
    method: 'post',
})

setPassword.definition = {
    methods: ["post"],
    url: '/api/data-auth/set-password',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\DataAuthController::setPassword
 * @see app/Http/Controllers/Api/DataAuthController.php:29
 * @route '/api/data-auth/set-password'
 */
setPassword.url = (options?: RouteQueryOptions) => {
    return setPassword.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataAuthController::setPassword
 * @see app/Http/Controllers/Api/DataAuthController.php:29
 * @route '/api/data-auth/set-password'
 */
setPassword.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: setPassword.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\DataAuthController::setPassword
 * @see app/Http/Controllers/Api/DataAuthController.php:29
 * @route '/api/data-auth/set-password'
 */
    const setPasswordForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: setPassword.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\DataAuthController::setPassword
 * @see app/Http/Controllers/Api/DataAuthController.php:29
 * @route '/api/data-auth/set-password'
 */
        setPasswordForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: setPassword.url(options),
            method: 'post',
        })
    
    setPassword.form = setPasswordForm
/**
* @see \App\Http\Controllers\Api\DataAuthController::me
 * @see app/Http/Controllers/Api/DataAuthController.php:90
 * @route '/api/data-auth/me'
 */
export const me = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: me.url(options),
    method: 'get',
})

me.definition = {
    methods: ["get","head"],
    url: '/api/data-auth/me',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\DataAuthController::me
 * @see app/Http/Controllers/Api/DataAuthController.php:90
 * @route '/api/data-auth/me'
 */
me.url = (options?: RouteQueryOptions) => {
    return me.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\DataAuthController::me
 * @see app/Http/Controllers/Api/DataAuthController.php:90
 * @route '/api/data-auth/me'
 */
me.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: me.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\DataAuthController::me
 * @see app/Http/Controllers/Api/DataAuthController.php:90
 * @route '/api/data-auth/me'
 */
me.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: me.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\DataAuthController::me
 * @see app/Http/Controllers/Api/DataAuthController.php:90
 * @route '/api/data-auth/me'
 */
    const meForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: me.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\DataAuthController::me
 * @see app/Http/Controllers/Api/DataAuthController.php:90
 * @route '/api/data-auth/me'
 */
        meForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: me.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\DataAuthController::me
 * @see app/Http/Controllers/Api/DataAuthController.php:90
 * @route '/api/data-auth/me'
 */
        meForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: me.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    me.form = meForm
const DataAuthController = { login, check, setPassword, me }

export default DataAuthController