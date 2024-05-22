"use strict";

const jwt = require("jsonwebtoken");
const moment = require("moment");
const secret = process.env.JWT_SECRET;

exports.auth = function (req, res, next) {
    if (!req.headers.authorization) {
        return res.status(403).send({ message: "Authorization header is missing" });
    }
    const token = req.headers.authorization.replace(/['"]+/g, "");

    try {
        const payload = jwt.verify(token, secret);
        if (payload.exp <= moment().unix()) {
            return res.status(401).send({ message: "Token has expired" });
        }

        req.user = payload;
    } catch (error) {
        return res.status(403).send({ message: "The token is invalid: " + error.message });
    }

    next();
};
