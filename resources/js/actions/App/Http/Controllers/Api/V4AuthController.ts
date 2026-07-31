import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\V4AuthController::check
 * @see app/Http/Controllers/Api/V4AuthController.php:13
 * @route '/api/v4-auth/check'
 */
export const check = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: check.url(options),
    method: 'post',
})

check.definition = {
    methods: ["post"],
    url: '/api/v4-auth/check',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\V4AuthController::check
 * @see app/Http/Controllers/Api/V4AuthController.php:13
 * @route '/api/v4-auth/check'
 */
check.url = (options?: RouteQueryOptions) => {
    return check.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\V4AuthController::check
 * @see app/Http/Controllers/Api/V4AuthController.php:13
 * @route '/api/v4-auth/check'
 */
check.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: check.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\V4AuthController::check
 * @see app/Http/Controllers/Api/V4AuthController.php:13
 * @route '/api/v4-auth/check'
 */
    const checkForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: check.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\V4AuthController::check
 * @see app/Http/Controllers/Api/V4AuthController.php:13
 * @route '/api/v4-auth/check'
 */
        checkForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: check.url(options),
            method: 'post',
        })
    
    check.form = checkForm
/**
* @see \App\Http\Controllers\Api\V4AuthController::setPassword
 * @see app/Http/Controllers/Api/V4AuthController.php:29
 * @route '/api/v4-auth/set-password'
 */
export const setPassword = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: setPassword.url(options),
    method: 'post',
})

setPassword.definition = {
    methods: ["post"],
    url: '/api/v4-auth/set-password',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\V4AuthController::setPassword
 * @see app/Http/Controllers/Api/V4AuthController.php:29
 * @route '/api/v4-auth/set-password'
 */
setPassword.url = (options?: RouteQueryOptions) => {
    return setPassword.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\V4AuthController::setPassword
 * @see app/Http/Controllers/Api/V4AuthController.php:29
 * @route '/api/v4-auth/set-password'
 */
setPassword.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: setPassword.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\V4AuthController::setPassword
 * @see app/Http/Controllers/Api/V4AuthController.php:29
 * @route '/api/v4-auth/set-password'
 */
    const setPasswordForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: setPassword.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\V4AuthController::setPassword
 * @see app/Http/Controllers/Api/V4AuthController.php:29
 * @route '/api/v4-auth/set-password'
 */
        setPasswordForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: setPassword.url(options),
            method: 'post',
        })
    
    setPassword.form = setPasswordForm
/**
* @see \App\Http\Controllers\Api\V4AuthController::login
 * @see app/Http/Controllers/Api/V4AuthController.php:57
 * @route '/api/v4-auth/login'
 */
export const login = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: login.url(options),
    method: 'post',
})

login.definition = {
    methods: ["post"],
    url: '/api/v4-auth/login',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\V4AuthController::login
 * @see app/Http/Controllers/Api/V4AuthController.php:57
 * @route '/api/v4-auth/login'
 */
login.url = (options?: RouteQueryOptions) => {
    return login.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\V4AuthController::login
 * @see app/Http/Controllers/Api/V4AuthController.php:57
 * @route '/api/v4-auth/login'
 */
login.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: login.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\V4AuthController::login
 * @see app/Http/Controllers/Api/V4AuthController.php:57
 * @route '/api/v4-auth/login'
 */
    const loginForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: login.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\V4AuthController::login
 * @see app/Http/Controllers/Api/V4AuthController.php:57
 * @route '/api/v4-auth/login'
 */
        loginForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: login.url(options),
            method: 'post',
        })
    
    login.form = loginForm
/**
* @see \App\Http\Controllers\Api\V4AuthController::logout
 * @see app/Http/Controllers/Api/V4AuthController.php:84
 * @route '/api/v4-auth/logout'
 */
export const logout = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: logout.url(options),
    method: 'post',
})

logout.definition = {
    methods: ["post"],
    url: '/api/v4-auth/logout',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\V4AuthController::logout
 * @see app/Http/Controllers/Api/V4AuthController.php:84
 * @route '/api/v4-auth/logout'
 */
logout.url = (options?: RouteQueryOptions) => {
    return logout.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\V4AuthController::logout
 * @see app/Http/Controllers/Api/V4AuthController.php:84
 * @route '/api/v4-auth/logout'
 */
logout.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: logout.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\V4AuthController::logout
 * @see app/Http/Controllers/Api/V4AuthController.php:84
 * @route '/api/v4-auth/logout'
 */
    const logoutForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: logout.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\V4AuthController::logout
 * @see app/Http/Controllers/Api/V4AuthController.php:84
 * @route '/api/v4-auth/logout'
 */
        logoutForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: logout.url(options),
            method: 'post',
        })
    
    logout.form = logoutForm
/**
* @see \App\Http\Controllers\Api\V4AuthController::me
 * @see app/Http/Controllers/Api/V4AuthController.php:91
 * @route '/api/v4-auth/me'
 */
export const me = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: me.url(options),
    method: 'get',
})

me.definition = {
    methods: ["get","head"],
    url: '/api/v4-auth/me',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\V4AuthController::me
 * @see app/Http/Controllers/Api/V4AuthController.php:91
 * @route '/api/v4-auth/me'
 */
me.url = (options?: RouteQueryOptions) => {
    return me.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\V4AuthController::me
 * @see app/Http/Controllers/Api/V4AuthController.php:91
 * @route '/api/v4-auth/me'
 */
me.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: me.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\V4AuthController::me
 * @see app/Http/Controllers/Api/V4AuthController.php:91
 * @route '/api/v4-auth/me'
 */
me.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: me.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\V4AuthController::me
 * @see app/Http/Controllers/Api/V4AuthController.php:91
 * @route '/api/v4-auth/me'
 */
    const meForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: me.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\V4AuthController::me
 * @see app/Http/Controllers/Api/V4AuthController.php:91
 * @route '/api/v4-auth/me'
 */
        meForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: me.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\V4AuthController::me
 * @see app/Http/Controllers/Api/V4AuthController.php:91
 * @route '/api/v4-auth/me'
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
const V4AuthController = { check, setPassword, login, logout, me }

export default V4AuthController