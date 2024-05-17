"use strict";
const AuditLog = require("../models/auditLogModel");
const { ErrorHandler, handleErrorResponse, handleSuccessfulResponse } = require("../helpers/responseManagerHelper");


const getAuditLogsByTargetDoc = async (req, res) => {
    try {
        const { targetDoc } = req.params;
        const auditLogs = await AuditLog.find({ targetDoc })
            .populate('by', 'userName') 
            .sort({ createdAt: -1 });
        if (!auditLogs.length) {
            return res.status(404).json({ message: "No audit logs found for the provided document ID." });
        }
        res.status(200).json({ message: "Audit logs retrieved successfully", data: auditLogs });
    } catch (error) {
        console.error("Failed to retrieve audit logs:", error);
        res.status(500).json({ message: "An error occurred while retrieving audit logs." });
    }
};

const checkAuditLogs = async () => {
    const recentLogs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(50);
    recentLogs.forEach(log => {
        handleAlerts(log);
    });
};

const getAuditLogById = async (req, res) => {
    try {
        const { id } = req.params;
        const auditLog = await AuditLog.findById(id)
            .populate('by', 'userName') 
            .sort({ createdAt: -1 });

        if (!auditLog) {
            throw new ErrorHandler(404, "Audit log not found.");
        }
        res.status(200).json({ message: "Audit log retrieved successfully", data: auditLog });
    } catch (error) {
        handleError(error, res);
    }
};

const listAllAuditLogs = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const auditLogs = await AuditLog.find()
            .populate('by', 'userName') 
            .sort({ createdAt: -1 }) 
            .skip((page - 1) * limit)
            .limit(limit);

        if (!auditLogs.length) {
            return res.status(404).json({ message: "No audit logs found." });
        }

        res.status(200).json({ message: "Audit logs retrieved successfully", data: auditLogs });
    } catch (error) {
        console.error("Failed to retrieve audit logs:", error);
        res.status(500).json({ message: "An error occurred while retrieving audit logs." });
    }
};

const deleteAuditLog = async (req, res) => {
    try {
        const { id } = req.params;
        const auditLog = await AuditLog.findByIdAndRemove(id);
        if (!auditLog) {
            throw new ErrorHandler(404, "Audit log not found.");
        }
        res.status(200).json({ message: "Audit log deleted successfully" });
    } catch (error) {
        handleError(error, res);
    }
};

module.exports = {
    getAuditLogsByTargetDoc,
    getAuditLogById,
    listAllAuditLogs,
    checkAuditLogs,
    deleteAuditLog
};
