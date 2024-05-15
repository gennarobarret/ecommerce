// mailHelper.js
const nodemailer = require('nodemailer');

// Configura el transporte de correo electrónico
let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USERNAME, // usuario SMTP
        pass: process.env.EMAIL_PASSWORD, // contraseña SMTP
    },
});

module.exports = transporter;
