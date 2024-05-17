// userCleanupHelper.js
const User = require("../models/userModel");
const deleteUserIfNotVerified = async () => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - 2); // Configura esto a 2 días atrás

    try {
        const result = await User.deleteMany({
            Verification: 'notVerified',
            createdAt: { $lt: expirationDate }
        });
        console.log('Usuarios no verificados eliminados con éxito. Cantidad:', result.deletedCount);
    } catch (error) {
        console.error('Error al eliminar usuarios no verificados:', error);
    }
};

module.exports = { deleteUserIfNotVerified };
