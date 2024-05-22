require('dotenv').config(); // Esta línea configura las variables de entorno

"use strict";

const jwt = require("jsonwebtoken");
const moment = require("moment");

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in .env');
}

const secret = process.env.JWT_SECRET;

exports.createToken = function (user) {
    if (!user) {
        throw new Error("User data is required to create a token");
    }

    const payload = {
        sub: user._id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress,
        profileImage: user.profileImage,
        role: user.role,
        iat: moment().unix(),
        exp: moment().add(1, "days").unix(),
    };
    console.log("🚀 ~ payload:", payload)

    return jwt.sign(payload, secret); // Aquí cambiamos `encode` por `sign`
};
