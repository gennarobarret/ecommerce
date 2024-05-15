const AuditLog = require('../models/auditLogModel');
const User = require('../models/userModel');
const logger = require('./logHelper');

async function getUserNameById(userId) {
    try {
        const user = await User.findById(userId);
        return user ? user.userName : "UnknownUser";
    } catch (error) {
        console.error("Error retrieving user name:", error);
        return "UnknownUser";
    }
}

async function logAudit(action, by, targetDoc, targetType, alertLevel, message, ipAddress) {
    try {
        if (!by) {
            by = "UnknownUser";
        } else if (typeof by === 'object') {
            by = await getUserNameById(by);
        }
        await AuditLog.create({
            action,
            by,
            targetDoc,
            targetType,
            alertLevel,
            details: { message },
            ipAddress
        });
    } catch (err) {
        logger.error("Error creating audit log: ", err);
    }
}

module.exports = {
    logAudit,
    getUserNameById
};