// helpers/validate.js
const Joi = require('joi');



const validateUser = (data, options = {}) => {
    const schema = Joi.object({
        _id: Joi.string()
            .messages({
                'string.base': 'The _id must be a string.'
            })
            .when('$idRequired', { is: true, then: Joi.required(), otherwise: Joi.optional() })
            .messages({
                'any.required': 'The _id field is required.'
            }),
        userName: Joi.string()
            .alphanum()
            .min(5)
            .max(20)
            .required()
            .messages({
                'string.alphanum': 'The username must only contain alpha-numeric characters.',
                'string.min': 'The username must be at least 5 characters long.',
                'string.max': 'The username must not exceed 20 characters.',
                'any.required': 'The username is a required field.'
            }),
        firstName: Joi.string().required().trim().messages({
            'any.required': 'The first name is a required field.'
        }),
        lastName: Joi.string().required().trim().messages({
            'any.required': 'The last name is a required field.'
        }),
        organizationName: Joi.string().min(3).max(30).trim().messages({
            'string.min': 'The organization name must be at least 3 characters long.',
            'string.max': 'The organization name must not exceed 30 characters.'
        }),
        countryAddress: Joi.string().trim(),
        stateAddress: Joi.string().trim(),
        emailAddress: Joi.string()
            .email()
            .required()
            .lowercase()
            .trim()
            .messages({
                'string.email': 'The email is not valid.',
                'any.required': 'The email is a required field.'
            }),
        authMethod: Joi.string()
            .valid('local', 'google', 'github')
            .default('local')
            .optional()
            .messages({
                'any.required': 'The authentication method is a required field.',
                'any.only': 'The authentication method must be one of local, google, github.'
            }),
        role: Joi.array()
            .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
            .required()
            .messages({
                'string.pattern.base': 'Each role must be a valid ObjectId.',
                'array.base': 'Role must be an array of ObjectIds.',
                'any.required': 'The role is a required field.'
            }),
        verification: Joi.string()
            .valid('verified', 'notVerified')
            .default('notVerified')
            .optional()
            .messages({
                'any.required': 'The verification field is required.',
                'any.only': 'verification must be either verified or notVerified.'
            }),
        password: Joi.string()
            // Primero, se define el patrón requerido para la contraseña.
            .pattern(new RegExp('^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$'))
            .messages({
                'string.pattern.base': 'The password must be at least 8 characters long, including numbers, uppercase, lowercase, and special characters.'
            })
            // Luego, se aplica la condición basada en $passwordRequired.
            .when('$passwordRequired', { is: true, then: Joi.required(), otherwise: Joi.optional() })
            // A continuación, se añade la lógica condicional para $authMethod.
            .when('$authMethod', {
                is: 'local',
                // Dentro de esta condición, se anida otra condición para $verification.
                then: Joi.when('$verification', {
                    is: 'verified',
                    // Si $verification es 'active', se requiere la contraseña y debe cumplir con el patrón definido.
                    then: Joi.required(),
                    otherwise: Joi.optional()
                }),
                otherwise: Joi.optional()
            }),
        phoneNumber: Joi.string().trim(),
        birthday: Joi.date().messages({
            'date.base': 'The birthday format is not valid.'
        }),
        identification: Joi.string().trim(),
        additionalInfo: Joi.string().trim(),
        profileImage: Joi.string()
            .trim()
            .allow(null)
            .default(null)
            .messages({
                // 'string.base': 'The profile picture must be text.',
                // 'any.required': 'Profile picture is required.'
            }),
        loginAttempts: Joi.number(),
        lockUntil: Joi.number()
    }).options({ abortEarly: false });
    return schema.validate(data, { context: { passwordRequired: options.passwordRequired ?? false } });
};

const validateUserForLogin = (userData) => {
    return validateUser(userData, { passwordRequired: true, idRequired: false });
};

const validateLogin = (data) => {
    const schema = Joi.object({
        userName: Joi.string()
            .alphanum()
            .min(1)
            .max(20)
            .trim()
            .required(),
        password: Joi.string()
            .trim()
            .required()
    });

    return schema.validate(data, { abortEarly: false });
};

const validateResetPassword = (data) => {
    const schema = Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string()
            .pattern(new RegExp('^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$'))
            .messages({
                'string.pattern.base': 'Password must be at least 8 characters, including numbers, uppercase, lowercase, and special characters.'
            })
            .required()
    }).options({ allowUnknown: false });

    return schema.validate(data, { abortEarly: false });
};

const validateRole = (data) => {
    const schema = Joi.object({
        name: Joi.string().required().messages({
            'any.required': 'The name is a required field.',
            'string.base': 'The name must be a string.'
        }),
        permissions: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).required().messages({
            'array.base': 'Permissions must be an array of ObjectIds.',
            'string.pattern.base': 'Each permission must be a valid ObjectId.'
        })
    }).options({ abortEarly: false });

    return schema.validate(data);
};

const validatePermission = (data) => {
    const schema = Joi.object({
        name: Joi.string().required().messages({
            'any.required': 'The name is a required field.',
            'string.base': 'The name must be a string.'
        }),
        action: Joi.string().required().messages({
            'any.required': 'The action is a required field.',
            'string.base': 'The action must be a string.'
        }),
        resource: Joi.string().required().messages({
            'any.required': 'The resource is a required field.',
            'string.base': 'The resource must be a string.'
        })
    }).options({ abortEarly: false });

    return schema.validate(data);
};

const auditLogSchema = (data) => {
    const schema = Joi.object({
        action: Joi.string().required(),
        by: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
        targetType: Joi.string().required(),
        targetDoc: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
        details: Joi.object(),
        alertLevel: Joi.string().valid('Critical', 'High', 'Medium', 'Low').required(),
        createdAt: Joi.date().default(() => new Date(), 'current date')
    }).options({ abortEarly: false });
    return schema.validate(data);
};

module.exports = {
    validateUser,
    validateLogin,
    validateUserForLogin,
    validateResetPassword,
    validateRole,
    validatePermission,
    auditLogSchema
};