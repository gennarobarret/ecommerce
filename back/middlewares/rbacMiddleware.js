// middlewares/rbacMiddleware.js
"use strict";

const User = require('../models/userModel');
const Role = require('../models/roleModel');
const logger = require('../helpers/logHelper');
const { ErrorHandler, handleError } = require("../helpers/errorHandler");

// HANDLER CONTROLLER
const handleControllerError = (error, res) => {
    logger.error('controller error:', error);
    if (!(error instanceof ErrorHandler)) {
        error = new ErrorHandler(500, error.message || "Server error");
    }
    handleError(error, res);
};

const rbacMiddleware = (action, resource) => async (req, res, next) => {
    try {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const role = await Role.findOne({
            'name': req.user.role
        }).populate('permissions');

        if (!role) {
            return res.status(403).json({ message: 'Role not found' });
        }

        const permissions = role.permissions || [];
        const isAuthorized = permissions.some(permission =>
            permission.action === action && permission.resource === resource);

        if (isAuthorized) {
            next();
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
    } catch (error) {
        logger.error('Error verifying permissions:', error);
        return res.status(500).json({ message: 'Error verifying permissions.' });
    }
};

module.exports = rbacMiddleware;