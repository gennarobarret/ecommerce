// fileHelper.js
const fs = require('fs').promises;
const path = require("path");
const logger = require('./logHelper');

const deleteFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') { // Ignorar error si el archivo no existe
            logger.error(`Error deleting file: ${err.message}`, { filePath });
            throw err;  // Re-throw para manejar más arriba si necesario
        }
    }
};

const moveFile = async (oldPath, newPath) => {
    try {
        // Eliminar archivo existente si existe
        await deleteFile(newPath);

        // Mover el archivo al nuevo destino
        await fs.rename(oldPath, newPath);
        return newPath;
    } catch (error) {
        logger.error(`Failed to move file: ${error.message}`, { oldPath, newPath });
        throw error;
    }
};

module.exports = {
    deleteFile,
    moveFile
};

