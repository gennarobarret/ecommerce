// helpers/responseHelper.js

const createSuccessfulResponse = (message, data) => {
    return {
        status: "success",
        message: message,
        data: data
    };
};

module.exports = {
    createSuccessfulResponse
};
