import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults, validateParameters } from './../wayfinder'
/**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::login
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:47
 * @route '/login'
 */
export const login = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: login.url(options),
    method: 'get',
})

login.definition = {
    methods: ["get","head"],
    url: '/login',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::login
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:47
 * @route '/login'
 */
login.url = (options?: RouteQueryOptions) => {
    return login.definition.url + queryParams(options)
}

/**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::login
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:47
 * @route '/login'
 */
login.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: login.url(options),
    method: 'get',
})
/**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::login
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:47
 * @route '/login'
 */
login.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: login.url(options),
    method: 'head',
})

    /**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::login
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:47
 * @route '/login'
 */
    const loginForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: login.url(options),
        method: 'get',
    })

            /**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::login
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:47
 * @route '/login'
 */
        loginForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: login.url(options),
            method: 'get',
        })
            /**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::login
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:47
 * @route '/login'
 */
        loginForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: login.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    login.form = loginForm
/**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::logout
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:100
 * @route '/logout'
 */
export const logout = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: logout.url(options),
    method: 'post',
})

logout.definition = {
    methods: ["post"],
    url: '/logout',
} satisfies RouteDefinition<["post"]>

/**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::logout
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:100
 * @route '/logout'
 */
logout.url = (options?: RouteQueryOptions) => {
    return logout.definition.url + queryParams(options)
}

/**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::logout
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:100
 * @route '/logout'
 */
logout.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: logout.url(options),
    method: 'post',
})

    /**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::logout
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:100
 * @route '/logout'
 */
    const logoutForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: logout.url(options),
        method: 'post',
    })

            /**
* @see \Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::logout
 * @see vendor/laravel/fortify/src/Http/Controllers/AuthenticatedSessionController.php:100
 * @route '/logout'
 */
        logoutForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: logout.url(options),
            method: 'post',
        })
    
    logout.form = logoutForm
/**
* @see \Laravel\Fortify\Http\Controllers\RegisteredUserController::register
 * @see vendor/laravel/fortify/src/Http/Controllers/RegisteredUserController.php:41
 * @route '/register'
 */
export const register = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: register.url(options),
    method: 'get',
})

register.definition = {
    methods: ["get","head"],
    url: '/register',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \Laravel\Fortify\Http\Controllers\RegisteredUserController::register
 * @see vendor/laravel/fortify/src/Http/Controllers/RegisteredUserController.php:41
 * @route '/register'
 */
register.url = (options?: RouteQueryOptions) => {
    return register.definition.url + queryParams(options)
}

/**
* @see \Laravel\Fortify\Http\Controllers\RegisteredUserController::register
 * @see vendor/laravel/fortify/src/Http/Controllers/RegisteredUserController.php:41
 * @route '/register'
 */
register.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: register.url(options),
    method: 'get',
})
/**
* @see \Laravel\Fortify\Http\Controllers\RegisteredUserController::register
 * @see vendor/laravel/fortify/src/Http/Controllers/RegisteredUserController.php:41
 * @route '/register'
 */
register.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: register.url(options),
    method: 'head',
})

    /**
* @see \Laravel\Fortify\Http\Controllers\RegisteredUserController::register
 * @see vendor/laravel/fortify/src/Http/Controllers/RegisteredUserController.php:41
 * @route '/register'
 */
    const registerForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: register.url(options),
        method: 'get',
    })

            /**
* @see \Laravel\Fortify\Http\Controllers\RegisteredUserController::register
 * @see vendor/laravel/fortify/src/Http/Controllers/RegisteredUserController.php:41
 * @route '/register'
 */
        registerForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: register.url(options),
            method: 'get',
        })
            /**
* @see \Laravel\Fortify\Http\Controllers\RegisteredUserController::register
 * @see vendor/laravel/fortify/src/Http/Controllers/RegisteredUserController.php:41
 * @route '/register'
 */
        registerForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: register.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    register.form = registerForm
/**
 * @see routes/web.php:20
 * @route '/'
 */
export const home = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: home.url(options),
    method: 'get',
})

home.definition = {
    methods: ["get","head"],
    url: '/',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:20
 * @route '/'
 */
home.url = (options?: RouteQueryOptions) => {
    return home.definition.url + queryParams(options)
}

/**
 * @see routes/web.php:20
 * @route '/'
 */
home.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: home.url(options),
    method: 'get',
})
/**
 * @see routes/web.php:20
 * @route '/'
 */
home.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: home.url(options),
    method: 'head',
})

    /**
 * @see routes/web.php:20
 * @route '/'
 */
    const homeForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: home.url(options),
        method: 'get',
    })

            /**
 * @see routes/web.php:20
 * @route '/'
 */
        homeForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: home.url(options),
            method: 'get',
        })
            /**
 * @see routes/web.php:20
 * @route '/'
 */
        homeForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: home.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    home.form = homeForm
/**
 * @see routes/web.php:25
 * @route '/dashboard'
 */
export const dashboard = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(options),
    method: 'get',
})

dashboard.definition = {
    methods: ["get","head"],
    url: '/dashboard',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:25
 * @route '/dashboard'
 */
dashboard.url = (options?: RouteQueryOptions) => {
    return dashboard.definition.url + queryParams(options)
}

/**
 * @see routes/web.php:25
 * @route '/dashboard'
 */
dashboard.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(options),
    method: 'get',
})
/**
 * @see routes/web.php:25
 * @route '/dashboard'
 */
dashboard.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: dashboard.url(options),
    method: 'head',
})

    /**
 * @see routes/web.php:25
 * @route '/dashboard'
 */
    const dashboardForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: dashboard.url(options),
        method: 'get',
    })

            /**
 * @see routes/web.php:25
 * @route '/dashboard'
 */
        dashboardForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: dashboard.url(options),
            method: 'get',
        })
            /**
 * @see routes/web.php:25
 * @route '/dashboard'
 */
        dashboardForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: dashboard.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    dashboard.form = dashboardForm
/**
 * @see routes/web.php:29
 * @route '/quality'
 */
export const quality = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: quality.url(options),
    method: 'get',
})

quality.definition = {
    methods: ["get","head"],
    url: '/quality',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:29
 * @route '/quality'
 */
quality.url = (options?: RouteQueryOptions) => {
    return quality.definition.url + queryParams(options)
}

/**
 * @see routes/web.php:29
 * @route '/quality'
 */
quality.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: quality.url(options),
    method: 'get',
})
/**
 * @see routes/web.php:29
 * @route '/quality'
 */
quality.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: quality.url(options),
    method: 'head',
})

    /**
 * @see routes/web.php:29
 * @route '/quality'
 */
    const qualityForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: quality.url(options),
        method: 'get',
    })

            /**
 * @see routes/web.php:29
 * @route '/quality'
 */
        qualityForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: quality.url(options),
            method: 'get',
        })
            /**
 * @see routes/web.php:29
 * @route '/quality'
 */
        qualityForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: quality.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    quality.form = qualityForm
/**
 * @see routes/web.php:30
 * @route '/production'
 */
export const production = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: production.url(options),
    method: 'get',
})

production.definition = {
    methods: ["get","head"],
    url: '/production',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:30
 * @route '/production'
 */
production.url = (options?: RouteQueryOptions) => {
    return production.definition.url + queryParams(options)
}

/**
 * @see routes/web.php:30
 * @route '/production'
 */
production.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: production.url(options),
    method: 'get',
})
/**
 * @see routes/web.php:30
 * @route '/production'
 */
production.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: production.url(options),
    method: 'head',
})

    /**
 * @see routes/web.php:30
 * @route '/production'
 */
    const productionForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: production.url(options),
        method: 'get',
    })

            /**
 * @see routes/web.php:30
 * @route '/production'
 */
        productionForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: production.url(options),
            method: 'get',
        })
            /**
 * @see routes/web.php:30
 * @route '/production'
 */
        productionForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: production.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    production.form = productionForm
/**
 * @see routes/web.php:31
 * @route '/logistics'
 */
export const logistics = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: logistics.url(options),
    method: 'get',
})

logistics.definition = {
    methods: ["get","head"],
    url: '/logistics',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:31
 * @route '/logistics'
 */
logistics.url = (options?: RouteQueryOptions) => {
    return logistics.definition.url + queryParams(options)
}

/**
 * @see routes/web.php:31
 * @route '/logistics'
 */
logistics.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: logistics.url(options),
    method: 'get',
})
/**
 * @see routes/web.php:31
 * @route '/logistics'
 */
logistics.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: logistics.url(options),
    method: 'head',
})

    /**
 * @see routes/web.php:31
 * @route '/logistics'
 */
    const logisticsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: logistics.url(options),
        method: 'get',
    })

            /**
 * @see routes/web.php:31
 * @route '/logistics'
 */
        logisticsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: logistics.url(options),
            method: 'get',
        })
            /**
 * @see routes/web.php:31
 * @route '/logistics'
 */
        logisticsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: logistics.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    logistics.form = logisticsForm
/**
 * @see routes/web.php:32
 * @route '/developpement'
 */
export const development = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: development.url(options),
    method: 'get',
})

development.definition = {
    methods: ["get","head"],
    url: '/developpement',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:32
 * @route '/developpement'
 */
development.url = (options?: RouteQueryOptions) => {
    return development.definition.url + queryParams(options)
}

/**
 * @see routes/web.php:32
 * @route '/developpement'
 */
development.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: development.url(options),
    method: 'get',
})
/**
 * @see routes/web.php:32
 * @route '/developpement'
 */
development.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: development.url(options),
    method: 'head',
})

    /**
 * @see routes/web.php:32
 * @route '/developpement'
 */
    const developmentForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: development.url(options),
        method: 'get',
    })

            /**
 * @see routes/web.php:32
 * @route '/developpement'
 */
        developmentForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: development.url(options),
            method: 'get',
        })
            /**
 * @see routes/web.php:32
 * @route '/developpement'
 */
        developmentForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: development.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    development.form = developmentForm
/**
 * @see routes/web.php:33
 * @route '/methods'
 */
export const methods = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: methods.url(options),
    method: 'get',
})

methods.definition = {
    methods: ["get","head"],
    url: '/methods',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:33
 * @route '/methods'
 */
methods.url = (options?: RouteQueryOptions) => {
    return methods.definition.url + queryParams(options)
}

/**
 * @see routes/web.php:33
 * @route '/methods'
 */
methods.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: methods.url(options),
    method: 'get',
})
/**
 * @see routes/web.php:33
 * @route '/methods'
 */
methods.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: methods.url(options),
    method: 'head',
})

    /**
 * @see routes/web.php:33
 * @route '/methods'
 */
    const methodsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: methods.url(options),
        method: 'get',
    })

            /**
 * @see routes/web.php:33
 * @route '/methods'
 */
        methodsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: methods.url(options),
            method: 'get',
        })
            /**
 * @see routes/web.php:33
 * @route '/methods'
 */
        methodsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: methods.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    methods.form = methodsForm
/**
 * @see routes/web.php:34
 * @route '/admin'
 */
export const admin = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: admin.url(options),
    method: 'get',
})

admin.definition = {
    methods: ["get","head"],
    url: '/admin',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:34
 * @route '/admin'
 */
admin.url = (options?: RouteQueryOptions) => {
    return admin.definition.url + queryParams(options)
}

/**
 * @see routes/web.php:34
 * @route '/admin'
 */
admin.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: admin.url(options),
    method: 'get',
})
/**
 * @see routes/web.php:34
 * @route '/admin'
 */
admin.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: admin.url(options),
    method: 'head',
})

    /**
 * @see routes/web.php:34
 * @route '/admin'
 */
    const adminForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: admin.url(options),
        method: 'get',
    })

            /**
 * @see routes/web.php:34
 * @route '/admin'
 */
        adminForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: admin.url(options),
            method: 'get',
        })
            /**
 * @see routes/web.php:34
 * @route '/admin'
 */
        adminForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: admin.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    admin.form = adminForm
/**
 * @see routes/web.php:37
 * @route '/unauthorized'
 */
export const unauthorized = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: unauthorized.url(options),
    method: 'get',
})

unauthorized.definition = {
    methods: ["get","head"],
    url: '/unauthorized',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:37
 * @route '/unauthorized'
 */
unauthorized.url = (options?: RouteQueryOptions) => {
    return unauthorized.definition.url + queryParams(options)
}

/**
 * @see routes/web.php:37
 * @route '/unauthorized'
 */
unauthorized.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: unauthorized.url(options),
    method: 'get',
})
/**
 * @see routes/web.php:37
 * @route '/unauthorized'
 */
unauthorized.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: unauthorized.url(options),
    method: 'head',
})

    /**
 * @see routes/web.php:37
 * @route '/unauthorized'
 */
    const unauthorizedForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: unauthorized.url(options),
        method: 'get',
    })

            /**
 * @see routes/web.php:37
 * @route '/unauthorized'
 */
        unauthorizedForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: unauthorized.url(options),
            method: 'get',
        })
            /**
 * @see routes/web.php:37
 * @route '/unauthorized'
 */
        unauthorizedForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: unauthorized.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    unauthorized.form = unauthorizedForm
/**
 * @see routes/web.php:39
 * @route '/v1/{any?}'
 */
export const v1 = (args?: { any?: string | number } | [any: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: v1.url(args, options),
    method: 'get',
})

v1.definition = {
    methods: ["get","head"],
    url: '/v1/{any?}',
} satisfies RouteDefinition<["get","head"]>

/**
 * @see routes/web.php:39
 * @route '/v1/{any?}'
 */
v1.url = (args?: { any?: string | number } | [any: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { any: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    any: args[0],
                }
    }

    args = applyUrlDefaults(args)

    validateParameters(args, [
            "any",
        ])

    const parsedArgs = {
                        any: args?.any,
                }

    return v1.definition.url
            .replace('{any?}', parsedArgs.any?.toString() ?? '')
            .replace(/\/+$/, '') + queryParams(options)
}

/**
 * @see routes/web.php:39
 * @route '/v1/{any?}'
 */
v1.get = (args?: { any?: string | number } | [any: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: v1.url(args, options),
    method: 'get',
})
/**
 * @see routes/web.php:39
 * @route '/v1/{any?}'
 */
v1.head = (args?: { any?: string | number } | [any: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: v1.url(args, options),
    method: 'head',
})

    /**
 * @see routes/web.php:39
 * @route '/v1/{any?}'
 */
    const v1Form = (args?: { any?: string | number } | [any: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: v1.url(args, options),
        method: 'get',
    })

            /**
 * @see routes/web.php:39
 * @route '/v1/{any?}'
 */
        v1Form.get = (args?: { any?: string | number } | [any: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: v1.url(args, options),
            method: 'get',
        })
            /**
 * @see routes/web.php:39
 * @route '/v1/{any?}'
 */
        v1Form.head = (args?: { any?: string | number } | [any: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: v1.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    v1.form = v1Form