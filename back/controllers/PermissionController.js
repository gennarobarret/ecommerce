// PermissionController.js
"use strict";

const Permission = require("../models/permissionModel");
const Role = require("../models/roleModel");
const logger = require('../helpers/logHelper');
const { validatePermission } = require('../helpers/validateHelper');
const { ErrorHandler, handleErrorResponse, handleSuccessfulResponse } = require("../helpers/responseManagerHelper");


const handleControllerError = (error, res) => {
    logger.error('controller error:', error);

    // Manejar error de clave duplicada de MongoDB
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue).join(', ');
        const message = `An item with the same ${field} already exists.`;
        return res.status(400).json({ status: "error", statusCode: 400, message });
    }

    // Manejar error de casting de ObjectId
    if (error.name === 'CastError' && error.path === '_id') {
        const message = `The provided ID value '${error.value}' is not a valid ObjectId.`;
        return res.status(400).json({ status: "error", statusCode: 400, message });
    }

    // Manejar otros errores como errores internos del servidor
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(statusCode).json({ status: "error", statusCode, message });
};


const createPermission = async (req, res) => {
    try {
        const userId = req.user.sub;
        if (!userId) {
            console.log("🚀 ~ updateUser ~ req.user:", req.user)
            return res.status(401).send({ message: "Access Denied" });
        }
        const { error } = validatePermission(req.body);
        if (error) {
            throw new ErrorHandler(400, error.details[0].message);
        }
        const { name, action, resource } = req.body;
        let permission = new Permission({ name, action, resource });
        await permission.saveWithAudit(userId);


        const masterAdminRole = await Role.findOne({ name: "MasterAdministrator" });
        if (masterAdminRole) {
            // Añade el nuevo permiso al rol de MasterAdministrator
            masterAdminRole.permissions.push(permission._id);
            await masterAdminRole.saveWithAudit(userId); // Guarda los cambios en el rol
        }

        res.status(200).json(handleSuccessfulResponse("Permission created successfully", { permission }));
    } catch (error) {
        handleErrorResponse(error, req, res);
    }
};



const updatePermission = async (req, res) => {
    try {
        const userId = req.user.sub;
        if (!userId) {
            console.log("🚀 ~ updateUser ~ req.user:", req.user)
            return res.status(401).send({ message: "Access Denied" });
        }
        const { error } = validatePermission(req.body);
        if (error) {
            throw new ErrorHandler(400, error.details[0].message);
        }

        // Extracción de los datos del cuerpo de la solicitud
        const { name, action, resource } = req.body;

        // Encontrar el documento de permiso primero
        let permission = await Permission.findById(req.params.id);
        if (!permission) {
            return res.status(404).send("Permission not found");
        }

        // Actualizar el documento con los nuevos valores
        permission.name = name;
        permission.action = action;
        permission.resource = resource;

        // Guardar los cambios usando saveWithAudit para asegurar el registro de auditoría
        await permission.saveWithAudit(userId); // Asume que req.user.sub contiene el ID del usuario que realiza la operación

        res.status(200).json(handleSuccessfulResponse("Permission updated successfully", { permission }));
    } catch (error) {
        handleErrorResponse(error, req, res);
    }
};



const deletePermission = async function (req, res) {
    try {
        const { id } = req.params;
        const permissionToDelete = await Permission.findOneAndDelete({ _id: id });
        if (!permissionToDelete) {
            throw new ErrorHandler(404, "Permission not found");
        }

        const userId = req.user.sub; // Asegúrate de que esta información está disponible

        await AuditLog.create({
            action: 'DELETE',
            by: userId,
            targetDoc: permissionToDelete._id,
            targetType: 'Permission',
            details: {
                message: "Permission deleted successfully"
            }
        });

        res.status(200).json(handleSuccessfulResponse("Permission deleted successfully", { id: permissionToDelete._id }));
    } catch (error) {
        handleErrorResponse(error, req, res);
    }
};

const listPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find();
        res.status(200).json(handleSuccessfulResponse("Permissions listed successfully", { permissions }));
    } catch (error) {
        handleErrorResponse(error, req, res);
    }
};


module.exports = {
    createPermission,
    updatePermission,
    deletePermission,
    listPermissions
};
