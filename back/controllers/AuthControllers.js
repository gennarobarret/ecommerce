// AuthControllers.js

require('dotenv').config();
const bcrypt = require("bcrypt");
const crypto = require('crypto');

const User = require("../models/userModel");
const Role = require("../models/roleModel");

const { ErrorHandler, handleErrorResponse, handleSuccessfulResponse } = require("../helpers/responseManager");
const logger = require('../helpers/logHelper');
const { logAudit } = require('../helpers/logAuditHelper');
const jwt = require("../helpers/jwt");
const { validateResetPassword, validateLogin } = require("../helpers/validate");
const generateUserName = require('../helpers/userNameGenerator.js');
const { checkIfAdminEmail } = require('../helpers/adminHelper');
const { verifyGoogleToken } = require('../helpers/googleAuthHelper');
const { sendActivationEmail, sendPasswordResetEmail, sendConfirmationEmail, sendVerificationEmail, verificationCodeUrl } = require('../helpers/emailService');

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS);
const LOCK_TIME = parseInt(process.env.LOCK_TIME);


function validateLoginEnvironment() {
    if (isNaN(MAX_LOGIN_ATTEMPTS) || isNaN(LOCK_TIME)) {
        throw new ErrorHandler(500, "Environment variables for login not properly configured.");
    }
}

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',').shift() || req.socket.remoteAddress;
}

function getCleanUser(user) {
    return {
        _id: user._id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress,
        role: user.role
    };
}

// LOGIN USERS
const loginUser = async (req, res) => {
    try {
        const ipAddress = getClientIp(req);
        validateLoginEnvironment();
        const { password, userName } = req.body;
        if (!password) {
            logger.error("Login attempt without password");
            throw new ErrorHandler(400, "Password is required", req.originalUrl, req.method, "Login attempt without password.");
        }
        const validationResult = validateLogin({ password, userName });
        if (validationResult.error) {
            const errorMessages = validationResult.error.details.map(detail => detail.message).join(', ');
            logger.error(`Login validation failed: ${errorMessages}`);
            throw new ErrorHandler(400, "Invalid input", errorMessages, req.originalUrl, req.method, `Login validation failed: ${errorMessages}`);
        }
        const user = await User.findOne({
            userName: { $regex: new RegExp('^' + userName + '$', 'i') }
        }).select('+password').populate('role');
        if (!user) {
            logger.warn(`Login attempt for non-existing user: ${userName} from IP: ${ipAddress}`);
            await logAudit(
                'LOGIN_ATTEMPT_NON_EXISTENT_USER',
                userName,
                null,
                'User',
                'Low',
                'Attempt to log in with a non-existent username.',
                ipAddress
            );
            throw new ErrorHandler(401, "Invalid credentials", req.originalUrl, req.method, `Login attempt for non-existing user: ${userName} from IP: ${ipAddress}`);
        }
        if (user.verification === "notVerified") {
            logger.warn(`Login attempt for not verified account: ${userName} from IP: ${ipAddress}`);
            await logAudit(
                'LOGIN_ATTEMPT_UNVERIFIED_ACCOUNT', // Acción más descriptiva
                user._id, // ID del usuario intentando acceder
                null, // Sin documento objetivo específico
                'User', // Tipo de documento afectado
                'Medium', // Nivel de alerta
                'Login attempt for an account that has not been verified.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó el acceso
            );
            throw new ErrorHandler(403, "Account not activated. Please check your email for activation link.", req.originalUrl, req.method, `Login attempt for not verified account: ${userName} from IP: ${ipAddress}`);
        }

        if (user.isBlocked) {
            logger.warn(`Login attempt for blocked account: ${userName} from IP: ${ipAddress}`);
            await logAudit(
                'LOGIN_ATTEMPT_BLOCKED_ACCOUNT', // Acción más descriptiva
                user._id, // ID del usuario intentando acceder
                null, // Sin documento objetivo específico
                'User', // Tipo de documento afectado
                'High', // Nivel de alerta
                'Login attempt for a temporarily locked account.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó el acceso
            );
            throw new ErrorHandler(403, "Account is temporarily locked. Try again later.", req.originalUrl, req.method, `Login attempt for blocked account: ${userName} from IP: ${ipAddress}`);
        }

        const check = await bcrypt.compare(password, user.password);
        if (!check) {
            logger.warn(`Failed login attempt for user: ${userName} from IP: ${ipAddress}`);
            user.loginAttempts += 1;
            if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS && !user.isBlocked) {
                user.lockUntil = Date.now() + LOCK_TIME;
                logger.info(`User ${userName} locked out due to too many failed attempts`);
            }
            await user.save();
            await logAudit(
                'LOGIN_FAILURE_INCORRECT_PASSWORD', // Acción más descriptiva
                user._id, // ID del usuario intentando acceder
                null, // Sin documento objetivo específico
                'User', // Tipo de documento afectado
                'High', // Nivel de alerta
                'Failed login attempt due to incorrect password.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó el acceso
            );
            throw new ErrorHandler(401, "Invalid credentials", req.originalUrl, req.method, `Failed login attempt for user: ${userName} from IP: ${ipAddress}`);
        }

        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
        const cleanUser = getCleanUser(user);
        const token = jwt.createToken({ ...cleanUser, role: user.role.name });
        res.status(200).json(handleSuccessfulResponse("Login successful", {
            user: cleanUser,
            token: token
        }));
        logger.info(`User ${userName} Successful login`, ipAddress);
        await logAudit(
            'LOGIN_SUCCESS', // Acción más descriptiva
            user._id, // ID del usuario que logró acceder
            user._id, // ID del documento objetivo (en este caso, el mismo usuario)
            'User', // Tipo de documento afectado
            'Low', // Nivel de alerta
            'User successfully authenticated.', // Mensaje detallado
            ipAddress // IP desde la cual se realizó el acceso
        );
    } catch (error) {
        logger.error(`Login error for user ${req.body.userName}: ${error.message}`, { stack: error.stack });
        handleErrorResponse(error, req, res);
    }
};

//  GOOGLE AUTHENTICATE 
const authenticateWithGoogle = async (req, res) => {
    try {
        const ipAddress = getClientIp(req);
        const { token } = req.body;
        const userInfo = await verifyGoogleToken(token);

        const isAdminEmail = checkIfAdminEmail(userInfo.email);
        const masterAdminRole = await Role.findOne({ name: 'MasterAdministrator' });
        if (!masterAdminRole) {
            throw new ErrorHandler(500, "MasterAdministrator role not found"), req.originalUrl, req.method, "Web app need a initial setup.";
        }

        const existsMasterAdmin = await User.findOne({ role: masterAdminRole._id });
        const roleName = (isAdminEmail && !existsMasterAdmin) ? 'MasterAdministrator' : 'Registered';
        let role = await Role.findOne({ name: roleName });
        if (!role) {
            logger.error("Role " + roleName + " not found.", ipAddress);
            throw new ErrorHandler(500, "Role not found", req.originalUrl, req.method, "This role need to be added.");
        }

        let user = await User.findOne({ googleId: userInfo.sub });
        if (!user) {
            user = new User({
                googleId: userInfo.sub,
                emailAddress: userInfo.email,
                firstName: userInfo.given_name,
                lastName: userInfo.family_name || "NoLastName",
                userName: generateUserName(userInfo.email),
                role: role._id,
                authMethod: "google",
                profileImage: userInfo.picture,
                emailVerified: userInfo.email_verified,
                locale: userInfo.locale,
                verification: userInfo.email_verified ? "verified" : "notVerified",
            });
            await user.save();
            logger.info(`New Google user registered: ${user.userName}`, ipAddress);
            await logAudit(
                'GOOGLE_USER_REGISTRATION', // Acción más descriptiva
                user._id, // ID del usuario recién creado
                user._id, // ID del documento objetivo (en este caso, el mismo usuario)
                'User', // Tipo de documento afectado
                'Medium', // Nivel de alerta
                'New user registered via Google authentication.', // Mensaje detallado
                ipAddress // IP desde la cual se realizó el acceso
            );
        } else {
            logger.info(`Existing Google user logged in: ${user.userName}`, ipAddress);
            await logAudit(
                'GOOGLE_USER_LOGIN', // Acción más descriptiva
                user._id, // ID del usuario existente
                user._id, // ID del documento objetivo (en este caso, el mismo usuario)
                'User', // Tipo de documento afectado
                'Low', // Nivel de alerta
                'Existing user logged in via Google authentication.', // Mensaje detallado
                ipAddress // IP desde la cual se realizó el acceso
            );
        }

        const userToken = jwt.createToken({
            sub: user._id.toString(),
            userName: user.userName,
            firstName: user.firstName,
            lastName: user.lastName,
            emailAddress: user.emailAddress,
            profileImage: user.profileImage,
            role: role.name,
        });

        const cleanedUser = getCleanUser(user);
        cleanedUser.role = role.name;

        res.status(200).json(handleSuccessfulResponse("Login successful", {
            user: cleanedUser,
            token: userToken
        }));

    } catch (error) {
        logger.error(`Google authentication error: ${error.message}`, ipAddress);
        // await logAudit(
        //     'GOOGLE_AUTHENTICATION_ERROR', // Acción más descriptiva
        //     null, // Sin usuario específico, ya que el error podría ser anterior a la identificación de usuario
        //     null, // Sin documento objetivo específico
        //     'System', // Tipo de documento afectado, 'System' indica un problema a nivel de sistema
        //     'High', // Nivel de alerta
        //     `Error during Google authentication: ${error.message}`, // Mensaje detallado incluyendo el mensaje de error
        //     ipAddress // IP desde la cual se intentó el acceso
        // );
        handleErrorResponse(error, req, res);
    }
};

// ACTIVATE USER ACCOUNT
const activateUser = async (req, res) => {
    try {
        const { token } = req.params;
        const ipAddress = getClientIp(req);

        const user = await User.findOne({
            configurationToken: token,
            configurationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            logger.warn(`Activation attempt with invalid or expired token from IP: ${ipAddress}`);
            await logAudit(
                'USER_ACTIVATION_ATTEMPT_FAIL', // Acción más descriptiva
                null, // Sin usuario específico identificado debido al token inválido
                null, // Sin documento objetivo específico
                'User', // Tipo de documento afectado
                'Medium', // Nivel de alerta
                'Activation attempt with an invalid or expired token.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la activación
            );
            throw new ErrorHandler(400, "Invalid or expired token.", req.originalUrl, req.method, "Checkout the token.");
        }

        if (user.verification === 'verified') {
            logger.warn(`Redundant activation attempt for already activated user: ${user.userName} from IP: ${ipAddress}`);
            await logAudit(
                'USER_ACTIVATION_REDUNDANT_ATTEMPT', // Acción más descriptiva
                user._id, // ID del usuario que intenta una activación redundante
                user._id, // ID del documento objetivo (en este caso, el mismo usuario)
                'User', // Tipo de documento afectado
                'Low', // Nivel de alerta
                'Redundant activation attempt for an already activated account.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la activación
            );
            throw new ErrorHandler(400, "This account has already been activated.", req.originalUrl, req.method, );
        }

        user.verification = 'verified';
        user.configurationToken = undefined;
        user.configurationTokenExpires = undefined;
        await user.save();

        try {
            const confirmationEmailSent = await sendActivationEmail(user);
            res.status(200).json(handleSuccessfulResponse("Account successfully activated", { confirmationEmailSent }));
            logger.info(`User account activated: ${user.userName} from IP: ${ipAddress}`);
            await logAudit(
                'USER_ACCOUNT_ACTIVATION_SUCCESS', // Acción más descriptiva
                user._id, // ID del usuario cuya cuenta se activó
                user._id, // ID del documento objetivo (en este caso, el mismo usuario)
                'User', // Tipo de documento afectado
                'Medium', // Nivel de alerta
                'User account successfully activated.', // Mensaje detallado
                ipAddress // IP desde la cual se completó la activación
            );
        } catch (mailError) {
            logger.error('Error sending confirmation email:', mailError);
            throw new ErrorHandler(500, "Account activated, but error sending confirmation email.");
        }

    } catch (error) {
        logger.error('activateUser error:', error);
        handleErrorResponse(error, req, res);
    }
};

// RESEND VERIFICATION EMAIL
const resendVerificationEmail = async (req, res) => {
    try {
        const { emailAddress } = req.body;
        if (!emailAddress) {
            throw new ErrorHandler(400, "Email address is required.");
        }
        const user = await User.findOne({ emailAddress, role: 'MasterAdministrator' });
        if (!user) {
            throw new ErrorHandler(404, "User not found.");
        }
        if (user.verification === 'verified') {
            throw new ErrorHandler(400, "This account has already been verified.");
        }

        const token = user.generateConfigurationToken();
        await user.save();
        await logAudit(
            'VERIFICATION_EMAIL_RESENT', // Acción más descriptiva
            user._id, // ID del usuario al que se intenta reenviar el correo
            user._id, // ID del documento objetivo (en este caso, el mismo usuario)
            'User', // Tipo de documento afectado
            'Low', // Nivel de alerta, ya que es un proceso informativo y no crítico
            'Verification email resent to an unverified user.', // Mensaje detallado
            req.ip // IP desde la cual se solicitó el reenvío
        );
        const mailSent = await sendVerificationEmail(user, token);
        if (!mailSent) {
            await logAudit(
                'VERIFICATION_EMAIL_SEND_FAIL', // Acción descriptiva sobre el fallo
                user._id, // ID del usuario afectado
                user._id, // ID del documento objetivo
                'User', // Tipo de documento afectado
                'High', // Nivel de alerta elevado debido a la importancia del proceso de verificación
                'Failed to send verification email due to system error.', // Mensaje detallado sobre el fallo
                req.ip // IP desde la cual se solicitó el reenvío
            );

            throw new ErrorHandler(500, "Error sending verification email.");
        }
        res.status(200).json(handleSuccessfulResponse("Verification email resent successfully to ", user.email));
    } catch (error) {
        logger.error('resendVerificationEmail error:', error);
        handleErrorResponse(error, req, res);
    }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
    try {
        const { emailAddress } = req.body;
        const ipAddress = getClientIp(req);

        if (!emailAddress) {
            logger.warn(`Forgot password attempt without email address from IP: ${ipAddress}`);
            await logAudit(
                'PASSWORD_RESET_ATTEMPT_NO_EMAIL', // Acción más descriptiva
                null, // Sin usuario específico identificado
                null, // Sin documento objetivo específico
                'User', // Tipo de documento afectado
                'Medium', // Nivel de alerta
                'Attempt to reset password without providing an email address.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la operación
            );
            throw new ErrorHandler(400, "Email address is required.");
        }
        const user = await User.findOne({ emailAddress });
        if (!user) {
            logger.info(`Forgot password attempt for non-existing email: ${emailAddress} from IP: ${ipAddress}`);
            await logAudit(
                'PASSWORD_RESET_NO_USER', // Acción más descriptiva
                null, // Sin usuario específico identificado
                null, // Sin documento objetivo específico
                'User', // Tipo de documento afectado
                'Low', // Nivel de alerta
                'Attempt to reset password for a non-existing email address.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la operación
            );
            throw new ErrorHandler(200, "If the email exists in our system, a password reset email will be sent.");
        }

        if (user.isBlocked) {
            logger.warn(`Attempted reset from blocked account: ${emailAddress}`);
            await logAudit(
                'PASSWORD_RESET_BLOCKED_USER', // Acción más descriptiva
                user._id, // ID del usuario afectado
                user._id, // ID del documento objetivo (en este caso, el mismo usuario)
                'User', // Tipo de documento afectado
                'High', // Nivel de alerta
                'Password reset attempt from a blocked account.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la operación
            );
            throw new ErrorHandler(403, "Account blocked. Operation not allowed.");
        }
        if (user.authMethod !== 'local') {
            logger.warn(`Reset attempt with non-local authentication method: ${emailAddress}`);
            await logAudit(
                'PASSWORD_RESET_NON_LOCAL_AUTH_METHOD', // Acción más descriptiva
                user._id, // ID del usuario afectado
                user._id, // ID del documento objetivo (en este caso, el mismo usuario)
                'User', // Tipo de documento afectado
                'Medium', // Nivel de alerta
                'Password reset attempt using a non-local authentication method.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la operación
            );
            throw new ErrorHandler(403, "Non-local authentication. Operation not allowed.");
        }
        const resetToken = user.generatePasswordResetToken();
        const verificationCode = user.generateVerificationCode();
        await user.save();
        const resetUrl = verificationCodeUrl(resetToken);
        const tokenExpiration = user.resetPasswordExpires - Date.now();

        await sendPasswordResetEmail(user.emailAddress, resetUrl, verificationCode, tokenExpiration);
        await logAudit(
            'PASSWORD_RESET_EMAIL_SENT', // Acción más descriptiva
            user._id, // ID del usuario al que se envió el correo
            user._id, // ID del documento objetivo (en este caso, el mismo usuario)
            'User', // Tipo de documento afectado
            'Medium', // Nivel de alerta
            'Password reset email sent successfully.', // Mensaje detallado
            ipAddress // IP desde la cual se completó la operación
        );
        res.status(200).json(handleSuccessfulResponse("If the email exists in our system, a password reset email will be sent.", {}));

    } catch (error) {
        logger.error(`Forgot password error: ${error.message} from IP: ${getClientIp(req)}`, { stack: error.stack });
        await logAudit(
            'PASSWORD_RESET_PROCESS_ERROR', // Acción más descriptiva
            null, // Sin usuario específico, si el error impide identificarlo
            null, // Sin documento objetivo específico
            'User', // Tipo de documento afectado
            'High', // Nivel de alerta
            `Server error during password reset process: ${error.message}`, // Mensaje detallado del error
            ipAddress // IP desde la cual se intentó la operación
        );
        handleErrorResponse(error, req, res);
    }
};

// VERIFY VERIFICATION CODE
const verificationCode = async (req, res) => {
    try {
        const { token, verificationCode } = req.body;
        const ipAddress = getClientIp(req);

        if (!token || !verificationCode) {
            logger.warn(`Verification attempt without token or code from IP: ${ipAddress}`);
            await logAudit(
                'VERIFICATION_ATTEMPT_MISSING_DETAILS', // Acción más descriptiva
                null, // Sin usuario identificado aún
                null, // Sin documento objetivo específico
                'User', // Tipo de documento afectado
                'Medium', // Nivel de alerta
                'Verification attempt failed due to missing token or verification code.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la operación
            );
            throw new ErrorHandler(400, "Token and verification code are required.");
        }
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            verificationCode,
            verificationCodeExpires: { $gt: Date.now() }
        });
        if (!user) {
            logger.warn(`Invalid or expired token or code used from IP: ${ipAddress}`);
            await logAudit(
                'VERIFICATION_ATTEMPT_INVALID_DETAILS', // Acción más descriptiva
                null, // Sin usuario identificado debido a la invalidez de los datos
                null, // Sin documento objetivo específico
                'User', // Tipo de documento afectado
                'High', // Nivel de alerta
                'Verification attempt failed due to invalid or expired token or verification code.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la operación
            );
            throw new ErrorHandler(400, "Invalid or expired token or verification code.");
        }
        const newResetToken = user.generatePasswordResetToken();
        user.verificationCode = null;
        user.verificationCodeExpires = null;
        await user.save();
        await logAudit(
            'VERIFICATION_CODE_VALIDATED', // Acción más descriptiva
            user._id, // ID del usuario que realizó la verificación exitosa
            user._id, // ID del documento objetivo (en este caso, el mismo usuario)
            'User', // Tipo de documento afectado
            'Low', // Nivel de alerta
            'Verification code validated successfully, user can now reset password.', // Mensaje detallado
            ipAddress // IP desde la cual se completó la operación
        );
        res.status(200).json(handleSuccessfulResponse("Verification code is valid. Change to a new password.",
            { resetToken: newResetToken }));
    } catch (error) {
        logger.error("Verify verification code error:", error);
        await logAudit(
            'VERIFICATION_CODE_PROCESSING_ERROR', // Acción más descriptiva
            null, // Sin usuario específico si el error impide la identificación
            null, // Sin documento objetivo específico
            'User', // Tipo de documento afectado
            'High', // Nivel de alerta
            `Error processing verification code: ${error.message}`, // Mensaje detallado del error
            getClientIp(req) // IP desde la cual se intentó la operación
        );
        handleErrorResponse(error, req, res);
    }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const ipAddress = getClientIp(req);
        const { error } = validateResetPassword(req.body);
        if (error) {
            logger.warn(`Reset password validation failed from IP: ${ipAddress}`, { error });
            await logAudit(
                'PASSWORD_RESET_VALIDATION_FAIL', // Acción más descriptiva
                null, // Sin usuario identificado en esta etapa
                null, // Sin documento objetivo específico
                'User', // Tipo de documento afectado
                'Medium', // Nivel de alerta
                'Password reset validation failed due to incorrect input.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la operación
            );
            throw new ErrorHandler(400, error.details.map(detail => detail.message).join(', '));
        }
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            logger.warn(`Invalid or expired password reset token used from IP: ${ipAddress}`);
            await logAudit(
                'PASSWORD_RESET_INVALID_OR_EXPIRED_TOKEN', // Acción más descriptiva
                null, // Sin usuario identificado debido a la invalidez del token
                null, // Sin documento objetivo específico
                'User', // Tipo de documento afectado
                'High', // Nivel de alerta
                'Password reset attempt with an invalid or expired token.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la operación
            );
            throw new ErrorHandler(400, "Invalid or expired password reset token.");
        }
        let isOldPassword = false;
        for (const p of user.passwordHistory) {
            if (await bcrypt.compare(newPassword, p.password)) {
                isOldPassword = true;
                break;
            }
        }
        if (isOldPassword) {
            logger.warn(`Attempt to reuse old password by user: ${user.userName} from IP: ${ipAddress}`);
            await logAudit(
                'PASSWORD_RESET_REUSE_OLD_PASSWORD', // Acción más descriptiva
                user._id, // ID del usuario que intenta reutilizar una contraseña antigua
                user._id, // ID del documento objetivo (en este caso, el mismo usuario)
                'User', // Tipo de documento afectado
                'High', // Nivel de alerta
                'User attempted to reuse an old password.', // Mensaje detallado
                ipAddress // IP desde la cual se intentó la operación
            );
            throw new ErrorHandler(400, "The new password cannot be the same as any of your previous passwords.");
        }
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        if (user.password) {
            user.passwordHistory.unshift({ password: user.password });
            if (user.passwordHistory.length > 5) {
                user.passwordHistory.pop();
            }
        }
        await user.save();
        await sendConfirmationEmail(user.emailAddress);
        await logAudit(
            'PASSWORD_RESET_COMPLETED', // Acción más descriptiva
            user._id, // ID del usuario cuya contraseña se ha restablecido exitosamente
            user._id, // ID del documento objetivo (en este caso, el mismo usuario)
            'User', // Tipo de documento afectado
            'High', // Nivel de alerta
            'Password has been reset successfully.', // Mensaje detallado
            ipAddress // IP desde la cual se completó la operación
        );
        res.status(200).json(handleSuccessfulResponse("Your password has been updated successfully.", {}));
    } catch (error) {
        logger.error(`Reset password error for user ${req.body.userName}: ${error.message}`, { stack: error.stack });
        await logAudit(
            'PASSWORD_RESET_PROCESS_ERROR', // Acción más descriptiva
            null, // Sin usuario específico si el error impide la identificación
            null, // Sin documento objetivo específico
            'User', // Tipo de documento afectado
            'High', // Nivel de alerta
            `Error during the password reset process: ${error.message}`, // Mensaje detallado del error
            getClientIp(req) // IP desde la cual se intentó la operación
        );
        handleErrorResponse(error, req, res);
    }
};

module.exports = {
    loginUser,
    forgotPassword,
    resetPassword,
    authenticateWithGoogle,
    activateUser,
    resendVerificationEmail,
    verificationCode
};