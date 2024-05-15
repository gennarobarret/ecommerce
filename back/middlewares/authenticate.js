"use strict";

var jwt = require("jwt-simple");
var moment = require("moment");
var secret = process.env.JWT_SECRET;

exports.auth = function (req, res, next) {
    if (!req.headers.authorization) {
        return res.status(403).send({ message: "Authorization header is missing" });
    }
    var token = req.headers.authorization.replace(/['"]+/g, "");
    try {
        var payload = jwt.decode(token, secret);
        if (payload.exp <= moment().unix()) {
            return res.status(401).send({ message: "Token has expired" });
        }

        req.user = payload;
    } catch (error) {
        return res.status(403).send({ message: "Token is invalid: " + error.message });
    }

    next();
};
