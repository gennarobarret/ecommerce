// validationFileHelper.js
const logger = require('./logHelper');

const validateProfileImage = (file) => {
    const maxFileSize = 5 * 1024 * 1024; // 5 MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg', 'image/gif'];

    if (!file) {
        logger.error("No file provided");
        throw new Error("No file provided.");
    }

    if (file.size > maxFileSize) {
        logger.error(`File size too large: ${file.size}`);
        throw new Error("File size too large. Must be under 5MB.");
    }

    if (!allowedTypes.includes(file.type)) {
        logger.error(`Invalid file type: ${file.type}`);
        throw new Error("Invalid file type. Only JPEG, PNG, WEBP, JPG, GIF are allowed.");
    }
};

const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

module.exports = {
    validateProfileImage,
    isValidObjectId
};
