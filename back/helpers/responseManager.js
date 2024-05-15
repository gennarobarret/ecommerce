// responseManager.js

const logger = require('./logHelper');
const { logAudit } = require('./logAuditHelper');

const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
};


class ErrorHandler extends Error {
    constructor(statusCode, message, path, method, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.path = path;
        this.method = method;
        this.details = details || 'No additional details provided.';
    }

    logError(req) {
        logger.error(`API Error: ${this.message}`, {
            path: this.path,
            method: this.method,
            status: this.statusCode,
            stack: this.details,
            timestamp: new Date().toISOString()
        });
        if (req.user) {
            logAudit('ERROR', req.user._id, this.path, "API", "High", this.message, getClientIp(req));
        }
    }

    handleResponse(res) {
        res.status(this.statusCode).json({
            status: "error",
            statusCode: this.statusCode,
            message: this.message,
            details: this.details || "No detailed information is available."
        });
    }
}

const handleErrorResponse = (error, req, res) => {
    if (!(error instanceof ErrorHandler)) {
        error = new ErrorHandler(500, error.message || "Server error", req.originalUrl, req.method, 'Contact support.');
    }
    error.logError(req);
    error.handleResponse(res);
};

const handleSuccessfulResponse = (message, data) => {
    return {
        status: "success",
        message: message,
        data: data
    };
};

module.exports = {
    ErrorHandler,
    handleErrorResponse,
    handleSuccessfulResponse
};
