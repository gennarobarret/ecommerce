require('dotenv').config();

const transporter = require('./mailHelper');
const logger = require('./logHelper');
const defaultFromEmail = process.env.EMAIL_SENDER || '"Your Application Name" <youremail@example.com>';
const frontendUrl = process.env.FRONTEND_URL || 'http://defaultfrontendurl.com';

async function sendMail(mailOptions) {
    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        logger.error('Error sending email:', error);
        return { success: false, error };
    }
}

function verificationCodeUrl(resetToken) {
    return `${frontendUrl}/auth/verification-code/${resetToken}`;
}


function activationUrl(token) {
    return `${frontendUrl}/auth/activation/${token}`;
}

function resetPasswordUrl(token) {
    return `${frontendUrl}/auth/reset-password/${token}`;
}


async function sendPasswordResetEmail(email, resetUrl, verificationCode, tokenExpiration) {
    const expirationTime = Math.round(tokenExpiration / (60 * 1000)); // Convert milliseconds to minutes
    const mailOptions = {
        from: defaultFromEmail,
        to: email,
        subject: "Password Reset Request",
        html: `
            <p>You have requested to reset your password. Your verification code is: ${verificationCode}.</p>
            <p>Please follow this link to reset your password: <a href="${resetUrl}">Reset Password</a></p>
            <p>This link will be active for <strong>${expirationTime} minutes</strong>. If you did not request this change, please ignore this email or contact our support team.</p>
        `,
    };
    return sendMail(mailOptions);
}


async function sendActivationEmail(user) {
    const mailOptions = {
        from: defaultFromEmail,
        to: user.emailAddress,
        subject: 'Account Activation',
        html: `<p>Your account has been successfully activated.</p>`,
    };
    return sendMail(mailOptions);
}

async function sendConfirmationEmail(email) {
    const mailOptions = {
        from: defaultFromEmail,
        to: email,
        subject: "Password Change Confirmation",
        html: `<p>Your password has been successfully changed.</p>`,
    };
    return sendMail(mailOptions);
}

async function sendVerificationEmail(user, token) {
    const activationUrl = resetPasswordUrl(token);
    const mailOptions = {
        from: defaultFromEmail,
        to: user.emailAddress,
        subject: 'Verify Your Account',
        html: `<p>Please follow this <a href="${activationUrl}">link</a> to verify your account.</p>`,
    };
    return sendMail(mailOptions);
}

module.exports = {
    sendActivationEmail,
    sendVerificationEmail,
    sendMail,
    sendPasswordResetEmail,
    sendConfirmationEmail,
    verificationCodeUrl,
    activationUrl,
    resetPasswordUrl
};
