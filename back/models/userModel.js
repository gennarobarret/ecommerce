// userModel.js
"use strict";
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;
const crypto = require('crypto');
const AuditLog = require('./auditLogModel');

const UserSchema = new Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 5,
        maxlength: 20,
        match: /^[a-zA-Z0-9]+$/
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    organizationName: {
        type: String,
        minlength: 3,
        maxlength: 30,
        trim: true
    },
    countryAddress: {
        type: String,
        trim: true
    },
    stateAddress: {
        type: String,
        trim: true
    },
    googleId: String,
    emailAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (email) {
                return /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
            },
            message: props => `${props.value}  it is not a valid mail`
        }
    },
    password: {
        type: String,
        required: function () {
            // Requerir la contraseña si el método de autenticación es 'local' y el usuario está verificado ('verified').
            return this.authMethod === 'local' && this.verification === 'verified';
        },
        select: false,
        validate: {
            validator: function (v) {
                // La validación de la complejidad de la contraseña se aplica solo si la contraseña es requerida.
                if (this.authMethod === 'local' && this.verification === 'verified') {
                    return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm.test(v);
                }
                // Si la contraseña no es requerida por las condiciones, se omite la validación de la complejidad.
                return true;
            },
            message: props => `${props.value} The password must be at least 8 characters and contain numbers, upper and lower case letters, and special characters.`,
        }
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    birthday: {
        type: Date
    },
    authMethod: {
        type: String,
        required: true,
        enum: ['local', 'google', 'github'],
        default: 'local'
    },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    identification: {
        type: String,
        trim: true
    },
    additionalInfo: {
        type: String,
        trim: true
    },
    profileImage: {
        type: String,
        trim: true,
        default: null
    },
    loginAttempts: {
        type: Number,
        required: true,
        default: 0
    },
    lockUntil: {
        type: Number
    },
    configurationToken: {
        type: String,
        default: null
    },
    configurationTokenExpires: {
        type: Date,
        default: null
    },
    verification: {
        type: String,
        enum: ['verified', 'notVerified'],
        required: true,
        default: 'notVerified'
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    passwordHistory: [{
        password: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        }
    }],
    verificationCode: String,
    verificationCodeExpires: Date,
    emailNotifications: {
        accountChanges: { type: Boolean, default: false },
        groupChanges: { type: Boolean, default: false },
        productUpdates: { type: Boolean, default: false },
        newProducts: { type: Boolean, default: false },
        marketingOffers: { type: Boolean, default: false },
        securityAlerts: { type: Boolean, default: false }
    },
},
    { id: false },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    },
    { timestamps: true });


UserSchema.methods.generatePasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpires = Date.now() + 3600000; // Establece la expiración para 1 hora desde ahora
    return resetToken;
};

UserSchema.methods.generateVerificationCode = function () {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Genera un código de 6 dígitos
    this.verificationCode = verificationCode;
    this.verificationCodeExpires = Date.now() + 900000; // 15 minutos
    return verificationCode;
};

UserSchema.methods.generateConfigurationToken = function () {
    const token = crypto.randomBytes(20).toString('hex');
    this.configurationToken = token;
    this.configurationTokenExpires = Date.now() + 3600000; // 1 hora
    return token;
};

UserSchema.virtual('isBlocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

UserSchema.pre('save', function (next) {
    if (this.isModified('password')) {
        if (this.passwordHistory.length >= 10) {
            this.passwordHistory.shift();
        }
        this.passwordHistory.push({ password: this.password });
    }
    next();
});


module.exports = mongoose.model("User", UserSchema);


// // Configura un campo virtual 'id' que devuelve el valor de '_id' como string.
// userSchema.virtual('id').get(function () {
//     return this._id.toHexString();
// });

// // Configura el esquema para que automáticamente elimine el '_id' y versionKey del resultado.
// userSchema.set('toJSON', {
//     virtuals: true,
//     versionKey: false,
//     transform: function (doc, ret) {   // Convertir documento antes de retornar el resultado
//         delete ret._id;
//     }
// });


// UserSchema.methods.isAccountLocked = function () {
//     return !!(this.lockUntil && this.lockUntil > Date.now());
// };
// UserSchema.methods.registerFailedLoginAttempt = async function () {
//     this.loginAttempts += 1;
//     if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS && !this.isAccountLocked()) {
//         this.lockUntil = Date.now() + LOCK_TIME;
//     }
//     await this.save();
// };
// UserSchema.methods.registerFailedLoginAttempt = async function () {
//     this.loginAttempts += 1;
//     if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS && !this.isAccountLocked()) {
//         this.lockUntil = Date.now() + LOCK_TIME;
//     }
//     await this.save();
// };

// UserSchema.methods.resetLoginAttempts = async function () {
//     if (this.loginAttempts !== 0 || this.lockUntil != null) {
//         this.loginAttempts = 0;
//         this.lockUntil = null;
//         await this.save();
//     }
// };





// UserSchema.statics.logAccessDenied = async function (userId, details) {
//     await AuditLog.create({
//         action: 'ACCESS_DENIED',
//         by: userId,
//         alertLevel: 'High',
//         details: details
//     });
// };

// UserSchema.methods.saveWithAudit = async function (userId, actionType) {
//     const alertLevel = this.determineAlertLevel(actionType);
//     try {
//         const savedUser = await this.save();
//         await AuditLog.create({
//             action: actionType,
//             by: userId,
//             targetDoc: this._id,
//             targetType: 'User',
//             alertLevel: alertLevel,
//             details: {
//                 // Detalles específicos aquí
//             }
//         });
//         return savedUser;
//     } catch (error) {
//         throw error;
//     }
// };

// UserSchema.methods.determineAlertLevel = function (actionType) {
//     switch (actionType) {
//         case 'CREATE':
//         case 'UPDATE':
//             return 'Medium';  // Crear o actualizar información de usuario son de mediana importancia.
//         case 'DELETE':
//             return 'High';  // Eliminar un usuario es una operación crítica.
//         case 'LOGIN_SUCCESS':
//             return 'Low';  // Inicios de sesión exitosos son rutinarios, pero buenos de rastrear.
//         case 'LOGIN_FAILURE':
//             return 'High';  // Fallas en el inicio de sesión pueden indicar intentos de acceso no autorizados.
//         case 'PASSWORD_RESET':
//             return 'Critical';  // Los resets de contraseña son operaciones críticas de seguridad.
//         case 'PASSWORD_CHANGE':
//             return 'High';  // Cambios en las contraseñas son importantes para la seguridad.
//         case 'ACCESS_DENIED':
//             return 'Critical';  // Accesos denegados indican violaciones potenciales de seguridad.
//         case 'AUTHENTICATE_GOOGLE':
//             return 'Low';  // Autenticación con Google es común y generalmente segura.
//         case 'ACTIVATE_ACCOUNT':
//             return 'High';  // La activación de cuentas es un paso crítico en la verificación de usuarios.
//         case 'RESEND_VERIFICATION_EMAIL':
//             return 'Medium';  // Reenviar un correo electrónico de verificación es de importancia media.
//         case 'FORGOT_PASSWORD':
//             return 'High';  // Solicitudes de olvido de contraseña son importantes por implicaciones de seguridad.
//         case 'VERIFY_VERIFICATION_CODE':
//             return 'High';  // Verificar códigos de verificación es crítico durante el reseteo de contraseña.
//         case 'RESET_PASSWORD':
//             return 'Critical';  // Resetear una contraseña es una acción de seguridad crítica.
//         case 'UPDATE_ACTIVE_STATUS':
//             return 'Medium';  // Actualizar el estado activo de un usuario individual es moderadamente crítico.
//         case 'BULK_UPDATE_ACTIVE_STATUS':
//             return 'High';  // Actualizar el estado activo de múltiples usuarios es de alta importancia.
//         default:
//             return 'Low';  // Acciones no especificadas son de baja importancia por defecto.
//     }
// };