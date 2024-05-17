// middleware/multerErrorHandler.js
const multerErrorHandler = (multerUpload) => {
    return (req, res, next) => {
        multerUpload(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    status: 'error',
                    message: err.message,
                });
            }
            next();
        });
    };
};

module.exports = multerErrorHandler;
