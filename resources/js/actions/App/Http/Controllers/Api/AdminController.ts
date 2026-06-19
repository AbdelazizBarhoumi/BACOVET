import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Api\AdminController::listJobs
 * @see app/Http/Controllers/Api/AdminController.php:27
 * @route '/admin/jobs'
 */
export const listJobs = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: listJobs.url(options),
    method: 'get',
})

listJobs.definition = {
    methods: ["get","head"],
    url: '/admin/jobs',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\AdminController::listJobs
 * @see app/Http/Controllers/Api/AdminController.php:27
 * @route '/admin/jobs'
 */
listJobs.url = (options?: RouteQueryOptions) => {
    return listJobs.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::listJobs
 * @see app/Http/Controllers/Api/AdminController.php:27
 * @route '/admin/jobs'
 */
listJobs.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: listJobs.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\AdminController::listJobs
 * @see app/Http/Controllers/Api/AdminController.php:27
 * @route '/admin/jobs'
 */
listJobs.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: listJobs.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::listJobs
 * @see app/Http/Controllers/Api/AdminController.php:27
 * @route '/admin/jobs'
 */
    const listJobsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: listJobs.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::listJobs
 * @see app/Http/Controllers/Api/AdminController.php:27
 * @route '/admin/jobs'
 */
        listJobsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: listJobs.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\AdminController::listJobs
 * @see app/Http/Controllers/Api/AdminController.php:27
 * @route '/admin/jobs'
 */
        listJobsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: listJobs.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    listJobs.form = listJobsForm
/**
* @see \App\Http\Controllers\Api\AdminController::runJob
 * @see app/Http/Controllers/Api/AdminController.php:47
 * @route '/admin/jobs/{id}/run'
 */
export const runJob = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: runJob.url(args, options),
    method: 'get',
})

runJob.definition = {
    methods: ["get","head"],
    url: '/admin/jobs/{id}/run',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\AdminController::runJob
 * @see app/Http/Controllers/Api/AdminController.php:47
 * @route '/admin/jobs/{id}/run'
 */
runJob.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return runJob.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::runJob
 * @see app/Http/Controllers/Api/AdminController.php:47
 * @route '/admin/jobs/{id}/run'
 */
runJob.get = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: runJob.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\AdminController::runJob
 * @see app/Http/Controllers/Api/AdminController.php:47
 * @route '/admin/jobs/{id}/run'
 */
runJob.head = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: runJob.url(args, options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::runJob
 * @see app/Http/Controllers/Api/AdminController.php:47
 * @route '/admin/jobs/{id}/run'
 */
    const runJobForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: runJob.url(args, options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::runJob
 * @see app/Http/Controllers/Api/AdminController.php:47
 * @route '/admin/jobs/{id}/run'
 */
        runJobForm.get = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: runJob.url(args, options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\AdminController::runJob
 * @see app/Http/Controllers/Api/AdminController.php:47
 * @route '/admin/jobs/{id}/run'
 */
        runJobForm.head = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: runJob.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    runJob.form = runJobForm
/**
* @see \App\Http\Controllers\Api\AdminController::listUsers
 * @see app/Http/Controllers/Api/AdminController.php:123
 * @route '/admin/users'
 */
export const listUsers = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: listUsers.url(options),
    method: 'get',
})

listUsers.definition = {
    methods: ["get","head"],
    url: '/admin/users',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\AdminController::listUsers
 * @see app/Http/Controllers/Api/AdminController.php:123
 * @route '/admin/users'
 */
listUsers.url = (options?: RouteQueryOptions) => {
    return listUsers.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::listUsers
 * @see app/Http/Controllers/Api/AdminController.php:123
 * @route '/admin/users'
 */
listUsers.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: listUsers.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\AdminController::listUsers
 * @see app/Http/Controllers/Api/AdminController.php:123
 * @route '/admin/users'
 */
listUsers.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: listUsers.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::listUsers
 * @see app/Http/Controllers/Api/AdminController.php:123
 * @route '/admin/users'
 */
    const listUsersForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: listUsers.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::listUsers
 * @see app/Http/Controllers/Api/AdminController.php:123
 * @route '/admin/users'
 */
        listUsersForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: listUsers.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\AdminController::listUsers
 * @see app/Http/Controllers/Api/AdminController.php:123
 * @route '/admin/users'
 */
        listUsersForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: listUsers.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    listUsers.form = listUsersForm
/**
* @see \App\Http\Controllers\Api\AdminController::createUser
 * @see app/Http/Controllers/Api/AdminController.php:128
 * @route '/admin/users'
 */
export const createUser = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: createUser.url(options),
    method: 'post',
})

createUser.definition = {
    methods: ["post"],
    url: '/admin/users',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\AdminController::createUser
 * @see app/Http/Controllers/Api/AdminController.php:128
 * @route '/admin/users'
 */
createUser.url = (options?: RouteQueryOptions) => {
    return createUser.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::createUser
 * @see app/Http/Controllers/Api/AdminController.php:128
 * @route '/admin/users'
 */
createUser.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: createUser.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::createUser
 * @see app/Http/Controllers/Api/AdminController.php:128
 * @route '/admin/users'
 */
    const createUserForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: createUser.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::createUser
 * @see app/Http/Controllers/Api/AdminController.php:128
 * @route '/admin/users'
 */
        createUserForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: createUser.url(options),
            method: 'post',
        })
    
    createUser.form = createUserForm
/**
* @see \App\Http\Controllers\Api\AdminController::updateUser
 * @see app/Http/Controllers/Api/AdminController.php:153
 * @route '/admin/users/{id}'
 */
export const updateUser = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateUser.url(args, options),
    method: 'put',
})

updateUser.definition = {
    methods: ["put"],
    url: '/admin/users/{id}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\AdminController::updateUser
 * @see app/Http/Controllers/Api/AdminController.php:153
 * @route '/admin/users/{id}'
 */
updateUser.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return updateUser.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::updateUser
 * @see app/Http/Controllers/Api/AdminController.php:153
 * @route '/admin/users/{id}'
 */
updateUser.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateUser.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::updateUser
 * @see app/Http/Controllers/Api/AdminController.php:153
 * @route '/admin/users/{id}'
 */
    const updateUserForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: updateUser.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::updateUser
 * @see app/Http/Controllers/Api/AdminController.php:153
 * @route '/admin/users/{id}'
 */
        updateUserForm.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: updateUser.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    updateUser.form = updateUserForm
/**
* @see \App\Http\Controllers\Api\AdminController::deleteUser
 * @see app/Http/Controllers/Api/AdminController.php:195
 * @route '/admin/users/{id}'
 */
export const deleteUser = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: deleteUser.url(args, options),
    method: 'delete',
})

deleteUser.definition = {
    methods: ["delete"],
    url: '/admin/users/{id}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\AdminController::deleteUser
 * @see app/Http/Controllers/Api/AdminController.php:195
 * @route '/admin/users/{id}'
 */
deleteUser.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return deleteUser.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::deleteUser
 * @see app/Http/Controllers/Api/AdminController.php:195
 * @route '/admin/users/{id}'
 */
deleteUser.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: deleteUser.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::deleteUser
 * @see app/Http/Controllers/Api/AdminController.php:195
 * @route '/admin/users/{id}'
 */
    const deleteUserForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: deleteUser.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'DELETE',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::deleteUser
 * @see app/Http/Controllers/Api/AdminController.php:195
 * @route '/admin/users/{id}'
 */
        deleteUserForm.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: deleteUser.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'DELETE',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    deleteUser.form = deleteUserForm
/**
* @see \App\Http\Controllers\Api\AdminController::toggleUser
 * @see app/Http/Controllers/Api/AdminController.php:186
 * @route '/admin/users/{id}/toggle'
 */
export const toggleUser = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'patch'> => ({
    url: toggleUser.url(args, options),
    method: 'patch',
})

toggleUser.definition = {
    methods: ["patch"],
    url: '/admin/users/{id}/toggle',
} satisfies RouteDefinition<["patch"]>

/**
* @see \App\Http\Controllers\Api\AdminController::toggleUser
 * @see app/Http/Controllers/Api/AdminController.php:186
 * @route '/admin/users/{id}/toggle'
 */
toggleUser.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return toggleUser.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::toggleUser
 * @see app/Http/Controllers/Api/AdminController.php:186
 * @route '/admin/users/{id}/toggle'
 */
toggleUser.patch = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'patch'> => ({
    url: toggleUser.url(args, options),
    method: 'patch',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::toggleUser
 * @see app/Http/Controllers/Api/AdminController.php:186
 * @route '/admin/users/{id}/toggle'
 */
    const toggleUserForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: toggleUser.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PATCH',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::toggleUser
 * @see app/Http/Controllers/Api/AdminController.php:186
 * @route '/admin/users/{id}/toggle'
 */
        toggleUserForm.patch = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: toggleUser.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PATCH',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    toggleUser.form = toggleUserForm
/**
* @see \App\Http\Controllers\Api\AdminController::listScreens
 * @see app/Http/Controllers/Api/AdminController.php:217
 * @route '/admin/screens'
 */
export const listScreens = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: listScreens.url(options),
    method: 'get',
})

listScreens.definition = {
    methods: ["get","head"],
    url: '/admin/screens',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\AdminController::listScreens
 * @see app/Http/Controllers/Api/AdminController.php:217
 * @route '/admin/screens'
 */
listScreens.url = (options?: RouteQueryOptions) => {
    return listScreens.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::listScreens
 * @see app/Http/Controllers/Api/AdminController.php:217
 * @route '/admin/screens'
 */
listScreens.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: listScreens.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\AdminController::listScreens
 * @see app/Http/Controllers/Api/AdminController.php:217
 * @route '/admin/screens'
 */
listScreens.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: listScreens.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::listScreens
 * @see app/Http/Controllers/Api/AdminController.php:217
 * @route '/admin/screens'
 */
    const listScreensForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: listScreens.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::listScreens
 * @see app/Http/Controllers/Api/AdminController.php:217
 * @route '/admin/screens'
 */
        listScreensForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: listScreens.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\AdminController::listScreens
 * @see app/Http/Controllers/Api/AdminController.php:217
 * @route '/admin/screens'
 */
        listScreensForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: listScreens.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    listScreens.form = listScreensForm
/**
* @see \App\Http\Controllers\Api\AdminController::createScreen
 * @see app/Http/Controllers/Api/AdminController.php:237
 * @route '/admin/screens'
 */
export const createScreen = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: createScreen.url(options),
    method: 'post',
})

createScreen.definition = {
    methods: ["post"],
    url: '/admin/screens',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\AdminController::createScreen
 * @see app/Http/Controllers/Api/AdminController.php:237
 * @route '/admin/screens'
 */
createScreen.url = (options?: RouteQueryOptions) => {
    return createScreen.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::createScreen
 * @see app/Http/Controllers/Api/AdminController.php:237
 * @route '/admin/screens'
 */
createScreen.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: createScreen.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::createScreen
 * @see app/Http/Controllers/Api/AdminController.php:237
 * @route '/admin/screens'
 */
    const createScreenForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: createScreen.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::createScreen
 * @see app/Http/Controllers/Api/AdminController.php:237
 * @route '/admin/screens'
 */
        createScreenForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: createScreen.url(options),
            method: 'post',
        })
    
    createScreen.form = createScreenForm
/**
* @see \App\Http\Controllers\Api\AdminController::updateScreen
 * @see app/Http/Controllers/Api/AdminController.php:222
 * @route '/admin/screens/{id}'
 */
export const updateScreen = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateScreen.url(args, options),
    method: 'put',
})

updateScreen.definition = {
    methods: ["put"],
    url: '/admin/screens/{id}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\AdminController::updateScreen
 * @see app/Http/Controllers/Api/AdminController.php:222
 * @route '/admin/screens/{id}'
 */
updateScreen.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return updateScreen.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::updateScreen
 * @see app/Http/Controllers/Api/AdminController.php:222
 * @route '/admin/screens/{id}'
 */
updateScreen.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateScreen.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::updateScreen
 * @see app/Http/Controllers/Api/AdminController.php:222
 * @route '/admin/screens/{id}'
 */
    const updateScreenForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: updateScreen.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::updateScreen
 * @see app/Http/Controllers/Api/AdminController.php:222
 * @route '/admin/screens/{id}'
 */
        updateScreenForm.put = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: updateScreen.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    updateScreen.form = updateScreenForm
/**
* @see \App\Http\Controllers\Api\AdminController::deleteScreen
 * @see app/Http/Controllers/Api/AdminController.php:254
 * @route '/admin/screens/{id}'
 */
export const deleteScreen = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: deleteScreen.url(args, options),
    method: 'delete',
})

deleteScreen.definition = {
    methods: ["delete"],
    url: '/admin/screens/{id}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\AdminController::deleteScreen
 * @see app/Http/Controllers/Api/AdminController.php:254
 * @route '/admin/screens/{id}'
 */
deleteScreen.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return deleteScreen.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::deleteScreen
 * @see app/Http/Controllers/Api/AdminController.php:254
 * @route '/admin/screens/{id}'
 */
deleteScreen.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: deleteScreen.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::deleteScreen
 * @see app/Http/Controllers/Api/AdminController.php:254
 * @route '/admin/screens/{id}'
 */
    const deleteScreenForm = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: deleteScreen.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'DELETE',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::deleteScreen
 * @see app/Http/Controllers/Api/AdminController.php:254
 * @route '/admin/screens/{id}'
 */
        deleteScreenForm.delete = (args: { id: string | number } | [id: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: deleteScreen.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'DELETE',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    deleteScreen.form = deleteScreenForm
/**
* @see \App\Http\Controllers\Api\AdminController::auditLogs
 * @see app/Http/Controllers/Api/AdminController.php:270
 * @route '/admin/audit-logs'
 */
export const auditLogs = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: auditLogs.url(options),
    method: 'get',
})

auditLogs.definition = {
    methods: ["get","head"],
    url: '/admin/audit-logs',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\AdminController::auditLogs
 * @see app/Http/Controllers/Api/AdminController.php:270
 * @route '/admin/audit-logs'
 */
auditLogs.url = (options?: RouteQueryOptions) => {
    return auditLogs.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::auditLogs
 * @see app/Http/Controllers/Api/AdminController.php:270
 * @route '/admin/audit-logs'
 */
auditLogs.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: auditLogs.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\AdminController::auditLogs
 * @see app/Http/Controllers/Api/AdminController.php:270
 * @route '/admin/audit-logs'
 */
auditLogs.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: auditLogs.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::auditLogs
 * @see app/Http/Controllers/Api/AdminController.php:270
 * @route '/admin/audit-logs'
 */
    const auditLogsForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: auditLogs.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::auditLogs
 * @see app/Http/Controllers/Api/AdminController.php:270
 * @route '/admin/audit-logs'
 */
        auditLogsForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: auditLogs.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\AdminController::auditLogs
 * @see app/Http/Controllers/Api/AdminController.php:270
 * @route '/admin/audit-logs'
 */
        auditLogsForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: auditLogs.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    auditLogs.form = auditLogsForm
/**
* @see \App\Http\Controllers\Api\AdminController::createAuditLog
 * @see app/Http/Controllers/Api/AdminController.php:275
 * @route '/admin/audit-logs'
 */
export const createAuditLog = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: createAuditLog.url(options),
    method: 'post',
})

createAuditLog.definition = {
    methods: ["post"],
    url: '/admin/audit-logs',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\AdminController::createAuditLog
 * @see app/Http/Controllers/Api/AdminController.php:275
 * @route '/admin/audit-logs'
 */
createAuditLog.url = (options?: RouteQueryOptions) => {
    return createAuditLog.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::createAuditLog
 * @see app/Http/Controllers/Api/AdminController.php:275
 * @route '/admin/audit-logs'
 */
createAuditLog.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: createAuditLog.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::createAuditLog
 * @see app/Http/Controllers/Api/AdminController.php:275
 * @route '/admin/audit-logs'
 */
    const createAuditLogForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: createAuditLog.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::createAuditLog
 * @see app/Http/Controllers/Api/AdminController.php:275
 * @route '/admin/audit-logs'
 */
        createAuditLogForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: createAuditLog.url(options),
            method: 'post',
        })
    
    createAuditLog.form = createAuditLogForm
/**
* @see \App\Http\Controllers\Api\AdminController::clearAuditLogs
 * @see app/Http/Controllers/Api/AdminController.php:293
 * @route '/admin/audit-logs'
 */
export const clearAuditLogs = (options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: clearAuditLogs.url(options),
    method: 'delete',
})

clearAuditLogs.definition = {
    methods: ["delete"],
    url: '/admin/audit-logs',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Api\AdminController::clearAuditLogs
 * @see app/Http/Controllers/Api/AdminController.php:293
 * @route '/admin/audit-logs'
 */
clearAuditLogs.url = (options?: RouteQueryOptions) => {
    return clearAuditLogs.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::clearAuditLogs
 * @see app/Http/Controllers/Api/AdminController.php:293
 * @route '/admin/audit-logs'
 */
clearAuditLogs.delete = (options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: clearAuditLogs.url(options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::clearAuditLogs
 * @see app/Http/Controllers/Api/AdminController.php:293
 * @route '/admin/audit-logs'
 */
    const clearAuditLogsForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: clearAuditLogs.url({
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'DELETE',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::clearAuditLogs
 * @see app/Http/Controllers/Api/AdminController.php:293
 * @route '/admin/audit-logs'
 */
        clearAuditLogsForm.delete = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: clearAuditLogs.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'DELETE',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    clearAuditLogs.form = clearAuditLogsForm
/**
* @see \App\Http\Controllers\Api\AdminController::getSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:309
 * @route '/admin/sync-config'
 */
export const getSyncConfig = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: getSyncConfig.url(options),
    method: 'get',
})

getSyncConfig.definition = {
    methods: ["get","head"],
    url: '/admin/sync-config',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\AdminController::getSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:309
 * @route '/admin/sync-config'
 */
getSyncConfig.url = (options?: RouteQueryOptions) => {
    return getSyncConfig.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::getSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:309
 * @route '/admin/sync-config'
 */
getSyncConfig.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: getSyncConfig.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\AdminController::getSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:309
 * @route '/admin/sync-config'
 */
getSyncConfig.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: getSyncConfig.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::getSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:309
 * @route '/admin/sync-config'
 */
    const getSyncConfigForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: getSyncConfig.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::getSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:309
 * @route '/admin/sync-config'
 */
        getSyncConfigForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: getSyncConfig.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\AdminController::getSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:309
 * @route '/admin/sync-config'
 */
        getSyncConfigForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: getSyncConfig.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    getSyncConfig.form = getSyncConfigForm
/**
* @see \App\Http\Controllers\Api\AdminController::updateSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:314
 * @route '/admin/sync-config/{key}'
 */
export const updateSyncConfig = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateSyncConfig.url(args, options),
    method: 'put',
})

updateSyncConfig.definition = {
    methods: ["put"],
    url: '/admin/sync-config/{key}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\AdminController::updateSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:314
 * @route '/admin/sync-config/{key}'
 */
updateSyncConfig.url = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { key: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    key: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        key: args.key,
                }

    return updateSyncConfig.definition.url
            .replace('{key}', parsedArgs.key.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::updateSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:314
 * @route '/admin/sync-config/{key}'
 */
updateSyncConfig.put = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateSyncConfig.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::updateSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:314
 * @route '/admin/sync-config/{key}'
 */
    const updateSyncConfigForm = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: updateSyncConfig.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::updateSyncConfig
 * @see app/Http/Controllers/Api/AdminController.php:314
 * @route '/admin/sync-config/{key}'
 */
        updateSyncConfigForm.put = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: updateSyncConfig.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    updateSyncConfig.form = updateSyncConfigForm
/**
* @see \App\Http\Controllers\Api\AdminController::listKpiValues
 * @see app/Http/Controllers/Api/AdminController.php:395
 * @route '/admin/kpi-values'
 */
export const listKpiValues = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: listKpiValues.url(options),
    method: 'get',
})

listKpiValues.definition = {
    methods: ["get","head"],
    url: '/admin/kpi-values',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\AdminController::listKpiValues
 * @see app/Http/Controllers/Api/AdminController.php:395
 * @route '/admin/kpi-values'
 */
listKpiValues.url = (options?: RouteQueryOptions) => {
    return listKpiValues.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::listKpiValues
 * @see app/Http/Controllers/Api/AdminController.php:395
 * @route '/admin/kpi-values'
 */
listKpiValues.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: listKpiValues.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\AdminController::listKpiValues
 * @see app/Http/Controllers/Api/AdminController.php:395
 * @route '/admin/kpi-values'
 */
listKpiValues.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: listKpiValues.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::listKpiValues
 * @see app/Http/Controllers/Api/AdminController.php:395
 * @route '/admin/kpi-values'
 */
    const listKpiValuesForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: listKpiValues.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::listKpiValues
 * @see app/Http/Controllers/Api/AdminController.php:395
 * @route '/admin/kpi-values'
 */
        listKpiValuesForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: listKpiValues.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\AdminController::listKpiValues
 * @see app/Http/Controllers/Api/AdminController.php:395
 * @route '/admin/kpi-values'
 */
        listKpiValuesForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: listKpiValues.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    listKpiValues.form = listKpiValuesForm
/**
* @see \App\Http\Controllers\Api\AdminController::updateKpiValue
 * @see app/Http/Controllers/Api/AdminController.php:339
 * @route '/admin/kpi-values/{key}'
 */
export const updateKpiValue = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateKpiValue.url(args, options),
    method: 'put',
})

updateKpiValue.definition = {
    methods: ["put"],
    url: '/admin/kpi-values/{key}',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Api\AdminController::updateKpiValue
 * @see app/Http/Controllers/Api/AdminController.php:339
 * @route '/admin/kpi-values/{key}'
 */
updateKpiValue.url = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { key: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    key: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        key: args.key,
                }

    return updateKpiValue.definition.url
            .replace('{key}', parsedArgs.key.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::updateKpiValue
 * @see app/Http/Controllers/Api/AdminController.php:339
 * @route '/admin/kpi-values/{key}'
 */
updateKpiValue.put = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: updateKpiValue.url(args, options),
    method: 'put',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::updateKpiValue
 * @see app/Http/Controllers/Api/AdminController.php:339
 * @route '/admin/kpi-values/{key}'
 */
    const updateKpiValueForm = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: updateKpiValue.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::updateKpiValue
 * @see app/Http/Controllers/Api/AdminController.php:339
 * @route '/admin/kpi-values/{key}'
 */
        updateKpiValueForm.put = (args: { key: string | number } | [key: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: updateKpiValue.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    updateKpiValue.form = updateKpiValueForm
/**
* @see \App\Http\Controllers\Api\AdminController::pipelineStatus
 * @see app/Http/Controllers/Api/AdminController.php:412
 * @route '/admin/pipeline/status'
 */
export const pipelineStatus = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: pipelineStatus.url(options),
    method: 'get',
})

pipelineStatus.definition = {
    methods: ["get","head"],
    url: '/admin/pipeline/status',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\AdminController::pipelineStatus
 * @see app/Http/Controllers/Api/AdminController.php:412
 * @route '/admin/pipeline/status'
 */
pipelineStatus.url = (options?: RouteQueryOptions) => {
    return pipelineStatus.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::pipelineStatus
 * @see app/Http/Controllers/Api/AdminController.php:412
 * @route '/admin/pipeline/status'
 */
pipelineStatus.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: pipelineStatus.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Api\AdminController::pipelineStatus
 * @see app/Http/Controllers/Api/AdminController.php:412
 * @route '/admin/pipeline/status'
 */
pipelineStatus.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: pipelineStatus.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::pipelineStatus
 * @see app/Http/Controllers/Api/AdminController.php:412
 * @route '/admin/pipeline/status'
 */
    const pipelineStatusForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: pipelineStatus.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::pipelineStatus
 * @see app/Http/Controllers/Api/AdminController.php:412
 * @route '/admin/pipeline/status'
 */
        pipelineStatusForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: pipelineStatus.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Api\AdminController::pipelineStatus
 * @see app/Http/Controllers/Api/AdminController.php:412
 * @route '/admin/pipeline/status'
 */
        pipelineStatusForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: pipelineStatus.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    pipelineStatus.form = pipelineStatusForm
/**
* @see \App\Http\Controllers\Api\AdminController::triggerSync
 * @see app/Http/Controllers/Api/AdminController.php:462
 * @route '/admin/pipeline/sync/{source}'
 */
export const triggerSync = (args: { source: string | number } | [source: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: triggerSync.url(args, options),
    method: 'post',
})

triggerSync.definition = {
    methods: ["post"],
    url: '/admin/pipeline/sync/{source}',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\AdminController::triggerSync
 * @see app/Http/Controllers/Api/AdminController.php:462
 * @route '/admin/pipeline/sync/{source}'
 */
triggerSync.url = (args: { source: string | number } | [source: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { source: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    source: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        source: args.source,
                }

    return triggerSync.definition.url
            .replace('{source}', parsedArgs.source.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::triggerSync
 * @see app/Http/Controllers/Api/AdminController.php:462
 * @route '/admin/pipeline/sync/{source}'
 */
triggerSync.post = (args: { source: string | number } | [source: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: triggerSync.url(args, options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::triggerSync
 * @see app/Http/Controllers/Api/AdminController.php:462
 * @route '/admin/pipeline/sync/{source}'
 */
    const triggerSyncForm = (args: { source: string | number } | [source: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: triggerSync.url(args, options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::triggerSync
 * @see app/Http/Controllers/Api/AdminController.php:462
 * @route '/admin/pipeline/sync/{source}'
 */
        triggerSyncForm.post = (args: { source: string | number } | [source: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: triggerSync.url(args, options),
            method: 'post',
        })
    
    triggerSync.form = triggerSyncForm
/**
* @see \App\Http\Controllers\Api\AdminController::triggerSyncAll
 * @see app/Http/Controllers/Api/AdminController.php:508
 * @route '/admin/pipeline/sync-all'
 */
export const triggerSyncAll = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: triggerSyncAll.url(options),
    method: 'post',
})

triggerSyncAll.definition = {
    methods: ["post"],
    url: '/admin/pipeline/sync-all',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Api\AdminController::triggerSyncAll
 * @see app/Http/Controllers/Api/AdminController.php:508
 * @route '/admin/pipeline/sync-all'
 */
triggerSyncAll.url = (options?: RouteQueryOptions) => {
    return triggerSyncAll.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\AdminController::triggerSyncAll
 * @see app/Http/Controllers/Api/AdminController.php:508
 * @route '/admin/pipeline/sync-all'
 */
triggerSyncAll.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: triggerSyncAll.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Api\AdminController::triggerSyncAll
 * @see app/Http/Controllers/Api/AdminController.php:508
 * @route '/admin/pipeline/sync-all'
 */
    const triggerSyncAllForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: triggerSyncAll.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Api\AdminController::triggerSyncAll
 * @see app/Http/Controllers/Api/AdminController.php:508
 * @route '/admin/pipeline/sync-all'
 */
        triggerSyncAllForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: triggerSyncAll.url(options),
            method: 'post',
        })
    
    triggerSyncAll.form = triggerSyncAllForm
const AdminController = { listJobs, runJob, listUsers, createUser, updateUser, deleteUser, toggleUser, listScreens, createScreen, updateScreen, deleteScreen, auditLogs, createAuditLog, clearAuditLogs, getSyncConfig, updateSyncConfig, listKpiValues, updateKpiValue, pipelineStatus, triggerSync, triggerSyncAll }

export default AdminController