const logger = require('./logHelper');
const { logAudit } = require('./logAuditHelper');

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
            // logAudit('ERROR', req.user._id, this.path, "API", "High", this.message, getClientIp(req));
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


const handleError = (error, req, res) => {
    if (!(error instanceof ErrorHandler)) {
        error = new ErrorHandler(500, error.message || "Server error", process.env.NODE_ENV === 'development' ? error.stack : 'Contact support.');
    }
    error.logError(req);
    error.handleResponse(res);
};

module.exports = {
    ErrorHandler,
    handleError
};


