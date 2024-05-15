// uploadConfig.js
const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/users/staffs');
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const newFileName = `${req.params.id}-${timestamp}${extension}`;
        cb(null, newFileName);
    }
});

// Configuración de Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, JPG, GIF are allowed.'));
        }
        cb(null, true);
    }
});

module.exports = upload;
