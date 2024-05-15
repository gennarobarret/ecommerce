// roleController.js
"use strict";

const Role = require("../models/roleModel");
const AuditLog = require('../models/auditLogModel');
const { validateRole } = require('../helpers/validate');
const logger = require('../helpers/logHelper');
const { ErrorHandler, handleError } = require("../helpers/errorHandler");
const { createSuccessfulResponse } = require("../helpers/responseHelper");

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

const createRole = async (req, res) => {
    try {
        const userId = req.user.sub;
        if (!userId) {
            console.log("🚀 ~ updateUser ~ req.user:", req.user)
            return res.status(401).send({ message: "Access Denied" });
        }

        const { error } = validateRole(req.body);
        if (error) {
            throw new ErrorHandler(400, error.details[0].message);
        }

        const { name, permissions } = req.body;
        let role = await Role.findOne({ name });
        if (role) {
            throw new ErrorHandler(400, `Role ${name} already exists.`);
        }
        role = new Role({ name, permissions });
        await role.saveWithAudit(userId);

        res.status(200).json(createSuccessfulResponse("Role created successfully", { role }));
    } catch (error) {
        handleControllerError(error, res);
    }
};

const updateRole = async (req, res) => {
    try {
        const userId = req.user.sub;  // Verificación del usuario autenticado
        if (!userId) {
            console.log("🚀 ~ updateUser ~ req.user:", req.user);
            return res.status(401).send({ message: "Access Denied" });
        }

        // Validación de los datos de entrada
        const { error } = validateRole(req.body);
        if (error) {
            throw new ErrorHandler(400, error.details[0].message);
        }

        const { name, permissions } = req.body;

        // Encontrar el rol por ID
        let role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).send({ message: "Role not found" });
        }

        // Si es "MasterAdministrator", asegurar que solo se agreguen permisos
        if (role.name === "MasterAdministrator") {
            // Convertir el array de ObjectId a strings para comparación
            const existingPermissions = role.permissions.map(id => id.toString());
            const newPermissions = permissions.map(id => id.toString());

            // Verificar que todos los permisos existentes están en los nuevos permisos
            const allExistingIncluded = existingPermissions.every(p => newPermissions.includes(p));

            if (!allExistingIncluded) {
                return res.status(403).json({ message: "Cannot remove existing permissions from MasterAdministrator role." });
            }
        }

        // Actualizar el nombre y permisos solo si se cumplen las condiciones
        role.name = name;
        role.permissions = permissions;  // Esto es seguro ya que se verifica que no se quiten permisos

        // Guardar los cambios con auditoría
        await role.saveWithAudit(userId);

        res.status(200).json(createSuccessfulResponse("Role updated successfully", { role }));
    } catch (error) {
        handleControllerError(error, res);
    }
};

// DELETE USER
const deleteRole = async function (req, res) {
    try {
        const { id } = req.params;
        const roleToDelete = await Role.findOneAndDelete({ _id: id });
        if (!roleToDelete) {
            throw new ErrorHandler(404, "Role not found");
        }

        const userId = req.user.sub;

        await AuditLog.create({
            action: 'DELETE',
            by: userId,
            targetDoc: roleToDelete._id,
            targetType: 'Role',
            details: {
                message: "Role deleted successfully"
            }
        });

        res.status(200).json(createSuccessfulResponse("Role deleted successfully", { id: roleToDelete._id }));
    } catch (error) {
        handleControllerError(error, res);
    }
};

const listRoles = async (req, res) => {
    try {
        const roles = await Role.find().populate('permissions');
        res.status(200).json(createSuccessfulResponse("Role listed successfully", { roles }));
    } catch (error) {
        handleControllerError(error, res);
    }
};

module.exports = {
    createRole,
    updateRole,
    deleteRole,
    listRoles
};

