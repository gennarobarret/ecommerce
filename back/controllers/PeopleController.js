// PeopleController.js
"use strict";

const User = require("../models/userModel");
const Role = require("../models/roleModel");

const transporter = require('../helpers/mailHelper');
const { validateUser } = require("../helpers/validate");

const fs = require('fs').promises;
const path = require("path");

const { ErrorHandler, handleErrorResponse, handleSuccessfulResponse } = require("../helpers/responseManager");

const fileHelper = require('../helpers/fileHelper');
const { validateProfileImage, isValidObjectId } = require("../helpers/validationFileHelper");
const logger = require('../helpers/logHelper');
const { getUserNameById, logAudit } = require('../helpers/logAuditHelper');


function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',').shift() || req.socket.remoteAddress;
}

const updateUserImage = async (req, res) => {
    let file;
    try {
        const userIdToUpdate = req.params.id;
        const ipAddress = getClientIp(req);
        const userName = await getUserNameById(userIdToUpdate);
        console.log("🚀 ~ updateUserImage ~ userName:", userName)

        file = req.files?.profileImage;
        if (!file) {
            await logAudit('UPDATE_PROFILE_IMAGE_NO_FILE_PROVIDED', userIdToUpdate, userIdToUpdate, 'User', 'Medium', 'No profile image file provided for update attempt.', ipAddress);
            throw new ErrorHandler(400, "No profile image file provided.");
        }

        validateProfileImage(file);  // Asegúrate de que esto valida y lanza errores si no cumple

        if (!isValidObjectId(userIdToUpdate)) {
            await logAudit('UPDATE_PROFILE_IMAGE_INVALID_USER_ID', null, null, 'User', 'Medium', 'Attempt to update profile image with invalid user ID format.', ipAddress);
            throw new ErrorHandler(400, "Invalid user ID format.");
        }

        let userToUpdate = await User.findById(userIdToUpdate);
        if (!userToUpdate) {
            await logAudit('UPDATE_PROFILE_IMAGE_USER_NOT_FOUND', null, null, 'User', 'Medium', 'Attempt to update profile image for non-existing user.', ipAddress);
            throw new ErrorHandler(404, "User not found.");
        }

        // Preparar el nuevo nombre y ubicación del archivo pero aún no moverlo
        const timestamp = Date.now();
        const extension = path.extname(file.originalFilename);
        const newFileName = `${userToUpdate._id}-${timestamp}${extension}`;
        const newProfileImagePath = path.join('uploads', 'users', 'staffs', newFileName);

        // Eliminar imagen anterior si existe
        if (userToUpdate.profileImage) {
            const oldProfileImagePath = path.join('uploads', 'users', 'staffs', userToUpdate.profileImage);
            await fileHelper.deleteFile(oldProfileImagePath);
        }

        // Ahora mover la nueva imagen al directorio con el nuevo nombre de archivo
        await fileHelper.moveFile(file.path, newProfileImagePath);

        // Actualizar el modelo de usuario
        userToUpdate.profileImage = newFileName;
        await userToUpdate.save();

        res.status(200).json(handleSuccessfulResponse("Profile image updated successfully", { profileImage: userToUpdate.profileImage }));
    } catch (error) {
        if (file && file.path) {
            // Intentar eliminar archivo temporal si existe
            await fileHelper.deleteFile(file.path).catch(err => logger.error(`Failed to delete temp file: ${err.message}`, { filePath: file.path }));
        }
        handleErrorResponse(error, req, res);
    }
};


// GET USER PROFILE PICTURE
const getUserImage = async function (req, res) {
    try {
        const profileImage = req.params["profileImage"];
        const path_img = path.resolve("./uploads/users/staffs", profileImage);
        await fs.stat(path_img);
        res.sendFile(path_img);
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.status(404).json(handleSuccessfulResponse("Image not found", {}));
        } else {
            handleErrorResponse(err, req, res);
        }
    };

}

// GET USER
const getUser = async (req, res) => {
    try {
        const email = req.user ? req.user.emailAddress : null;
        if (!email) {
            logger.warn("getUser attempt without email in token");
            throw new ErrorHandler(400, "No email found in token");
        }
        const user = await User.findOne({ emailAddress: email }, 'userName firstName lastName emailAddress authMethod isActive profileImage emailNotifications role')
            .populate({ path: 'role', select: 'name' });
        console.log("🚀 ~ getUser ~ user:", user)
        if (!user) {
            logger.info(`getUser attempt for non-existing user: ${email}`);
            await logAudit('GET_USER_ATTEMPT_FAIL', req.user.sub, null, 'User', 'Medium', `User not found for email: ${email}`);
            throw new ErrorHandler(404, "User not found");
        }
        const userData = {
            ...user.toObject(),
            role: user.role ? user.role.name : 'No role'
        };
        // Log successful retrieval
        logger.info(`User retrieved: ${userData.userName}`);
        await logAudit('GET_USER_SUCCESS', user._id, req.user.sub, 'User', 'Low', 'User data retrieved successfully');
        res.status(200).json(handleSuccessfulResponse("User found", userData));
    } catch (error) {
        logger.error(`getUser error: ${error.message}`);
        handleErrorResponse(error, req, res);
    }
};

// CREATE MASTER ADMIN USER
const createMasterAdmin = async (req, res) => {
    try {
        const { error } = validateUser(req.body, { passwordRequired: true });
        if (error) {
            throw new ErrorHandler(400, error.details[0].message);
        }
        const { firstName, lastName, emailAddress, password, userName } = req.body;

        const masterAdminRole = await Role.findOne({ name: 'MasterAdministrator' });
        if (!masterAdminRole) {
            throw new ErrorHandler(400, "MasterAdministrator role does not exist.");
        }

        const masterAdminExists = await User.exists({ role: masterAdminRole._id });
        if (masterAdminExists) {
            throw new ErrorHandler(400, "A Master Administrator is already registered.");
        }
        const masterAdmin = new User({
            userName,
            firstName,
            lastName,
            emailAddress,
            password,
            role: [masterAdminRole._id]
        });

        const token = masterAdmin.generateConfigurationToken();
        await masterAdmin.save();
        const activationUrl = `http://localhost:4200/auth/activation/${token}`;
        await transporter.sendMail({
            from: 'tuemail@example.com',
            to: masterAdmin.emailAddress,
            subject: 'Verify your MasterAdministrator account',
            html: `<p>Please follow this <a href="${activationUrl}">link</a> to activate your account.</p>`,
        });
        res.status(201).json(handleSuccessfulResponse("MasterAdministrator created successfully. Please verify your email.", { masterAdminId: masterAdmin._id }));
    } catch (error) {
        logger.error('createMasterAdmin error:', error);
        handleErrorResponse(error, res);
    }
};

// CREATE USER
const createUser = async (req, res) => {
    try {
        const userId = req.user.sub;
        if (!userId) {
            console.log("🚀 ~ updateUser ~ req.user:", req.user)
            return res.status(401).send({ message: "Access Denied" });
        }
        let data = req.body;
        const { error: validationError } = validateUser(data, { passwordRequired: false });
        if (validationError) {
            return res.status(400).send({
                message: validationError.details[0].message,
                data: undefined,
            });
        }
        const existingUser = await User.findOne({
            $or: [
                { userName: { $regex: new RegExp('^' + data.userName + '$', 'i') } },
                { emailAddress: { $regex: new RegExp('^' + data.emailAddress + '$', 'i') } },
                { identification: data.identification }
            ]
        });
        if (existingUser) {
            return res.status(409).send({
                message: 'Registration failed due to a conflict with existing data. Please review your information.',
                data: undefined,
            });
        }
        const userData = new User({
            ...data,
            profileImage: null,
            createdBy: userId,
            verification: 'notVerified'
        });
        if (req.files?.profileImage) {
            userData.profileImage = await handleProfileImageUpload(req.files.profileImage, userData.profileImage);
        }
        const token = userData.generateConfigurationToken();
        // await userData.saveWithAudit(userId);
        const alertLevel = userData.determineAlertLevel('CREATE');
        await userData.saveWithAudit(userId, 'CREATE', alertLevel);

        const setupUrl = `${process.env.FRONTEND_URL}/auth/activation/${token}`;
        await transporter.sendMail({
            from: 'tuemail@example.com',
            to: userData.emailAddress,
            subject: 'Verify your account',
            html: `<p>Please follow this <a href="${setupUrl}">link</a> to activate your account.</p>`,
        });

        res.status(200).json(handleSuccessfulResponse("User created successfully", { userId: userData._id, setupUrl }));
    } catch (error) {
        if (error instanceof ErrorHandler) {
            res.status(error.statusCode).send({ message: error.message });
        } else {
            handleErrorResponse(error, res);
        }
        if (req.files?.profileImage) {
            fs.unlink(req.files.profileImage.path, err => {
                if (err) logger.error("Error deleting file:", err);
            });
        }
    }
};

// GET USER BY ID
const getUserById = async (req, res) => {
    try {
        const userId = req.params["id"];
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const { password, __v, verification, configurationToken, configurationTokenExpires, googleId, loginAttempts, passwordHistory, ...userDataWithoutSensitiveInfo } = user.toObject();
        res.status(200).json(handleSuccessfulResponse("User found", userDataWithoutSensitiveInfo));
    } catch (error) {
        handleErrorResponse(error, res);
    }
};

// UPDATE USER INFO
const updateUser = async function (req, res) {
    try {
        const emailAddress = req.user.emailAddress;
        if (!emailAddress) {
            console.log("🚀 ~ updateUserInfo ~ req.user:", req.user);
            return res.status(401).send({ message: "Access Denied" });
        }
        const userIdToUpdate = req.params['id'];
        let data = req.body;

        const { error: validationError } = validateUser(data, { passwordRequired: false, idRequired: true });
        if (validationError) {
            throw new ErrorHandler(400, validationError.details[0].message);
        }

        let userToUpdate = await User.findById(userIdToUpdate);
        if (!userToUpdate) {
            return res.status(404).send({ message: "User not found." });
        }

        const fieldsToUpdate = [
            "firstName", "lastName", "organizationName", "countryAddress",
            "stateAddress", "emailAddress", "phoneNumber", "birthday",
            "role", "groups", "identification", "additionalInfo",
            "isActive"
        ];
        fieldsToUpdate.forEach(field => {
            if (data.hasOwnProperty(field)) {
                userToUpdate[field] = data[field];
            }
        });

        const alertLevel = userToUpdate.determineAlertLevel('UPDATE');
        await userToUpdate.saveWithAudit(emailAddress, 'UPDATE', alertLevel);
        const filteredUserData = (({ password, __v, verification, authMethod, configurationToken, configurationTokenExpires, googleId, loginAttempts, passwordHistory, ...rest }) => rest)(userToUpdate.toObject());
        res.status(200).json(handleSuccessfulResponse("User updated successfully", filteredUserData));
    } catch (error) {
        handleErrorResponse(error, req, res);
    }
};


// LIST USER DATA
const listAllUsers = async (req, res) => {
    try {
        let query = {};
        if (req.query.type && req.query.filter) {
            query[req.query.type] = new RegExp(req.query.filter, 'i');
        }
        const users = await User.find(query);
        const sanitizedUsers = users.map(user => {
            let userObject = user.toObject();
            delete userObject.passwordHistory;
            delete userObject.loginAttempts;
            delete userObject.configurationToken;
            delete userObject.resetPasswordToken;
            delete userObject.verificationCode;
            delete userObject.verificationCodeExpires;
            delete userObject.configurationTokenExpires;
            delete userObject.emailNotifications;
            delete userObject.lockUntil;
            delete userObject.resetPasswordExpires;
            delete userObject.__v;
            delete userObject.configurationTokenExpires;
            delete userObject.verification;
            return userObject;
        });
        res.status(200).json(handleSuccessfulResponse("Users listed successfully", sanitizedUsers));
    } catch (error) {
        handleErrorResponse(error, res);

    }
};

// DELETE USER
const deleteUser = async function (req, res) {
    try {
        const userId = req.user.sub; // ID del usuario que intenta realizar la acción
        const { id } = req.params;

        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            return res.status(404).json({ message: "User not found" });
        }

        // Determinar el nivel de alerta y guardar la auditoría antes de eliminar el usuario
        const alertLevel = userToDelete.determineAlertLevel('DELETE');
        await userToDelete.saveWithAudit(userId, 'DELETE', alertLevel);

        await userToDelete.remove(); // Ahora elimina el usuario después de guardar el log

        res.status(200).json(handleSuccessfulResponse("User deleted successfully", { id }));
    } catch (error) {
        handleErrorResponse(error, res);
    }
};

// UPDATE USER ACTIVE STATUS
const updateUserActiveStatus = async (req, res) => {
    const { userId } = req.params; // ID del usuario a actualizar
    const { isActive } = req.body; // Nuevo estado de actividad
    const modifierUserId = req.user.sub; // ID del usuario que realiza la acción

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "Invalid isActive value." });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        user.isActive = isActive;
        const alertLevel = user.determineAlertLevel('UPDATE_ACTIVE_STATUS');
        await user.saveWithAudit(modifierUserId, 'UPDATE_ACTIVE_STATUS', alertLevel);

        res.status(200).json({ message: "User active status updated successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while updating the user active status." });
    }
};

// UPDATE MULTIPLE USERS ACTIVE STATUS
const updateMultipleUserActiveStatus = async (req, res) => {
    const { userIds, isActive } = req.body; // `userIds` debe ser un arreglo de IDs y `isActive` el nuevo estado
    const modifierUserId = req.user.sub; // ID del usuario que realiza la acción

    if (!Array.isArray(userIds)) {
        return res.status(400).json({ message: "Invalid input: userIds must be an array." });
    }

    try {
        // Buscar todos los usuarios primero para determinar sus estados actuales
        const users = await User.find({ _id: { $in: userIds } });
        if (users.length === 0) {
            return res.status(404).json({ message: "No users found." });
        }

        users.forEach(async user => {
            user.isActive = isActive;
            const alertLevel = user.determineAlertLevel('BULK_UPDATE_ACTIVE_STATUS');
            await user.saveWithAudit(modifierUserId, 'BULK_UPDATE_ACTIVE_STATUS', alertLevel);
        });

        res.status(200).json({ message: "Users updated successfully.", updatedCount: users.length });
    } catch (error) {
        console.error("Error updating multiple users:", error);
        res.status(500).json({ message: "An error occurred while updating users." });
    }
};


module.exports = {
    createMasterAdmin,
    createUser,
    getUser,
    getUserById,
    getUserImage,
    updateUser,
    updateUserImage,
    listAllUsers,
    deleteUser,
    updateUserActiveStatus,
    updateMultipleUserActiveStatus
};

// // Función para manejar errores de manera centralizada
// const handleErrorResponse = (error, req, res) => {
//     logger.error(`Controller error: ${error.message}`, {
//         path: req.originalUrl,
//         method: req.method,
//         stack: error.stack
//     });
//     // logAudit('ERROR', req.user ? req.user._id : "UnknownUser", req.originalUrl, "API", "High", error.message, req.ip);
//     if (!(error instanceof ErrorHandler)) {
//         error = new ErrorHandler(500, error.message || "Server error", error.stack);
//     }
//     handleErrorResponse(error, res, error.message);
// };


// // Función para validar la imagen de perfil
// const validateProfileImage = (file) => {
//     const maxFileSize = 5 * 1024 * 1024; // 5 MB
//     const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg', 'image/gif'];

//     if (!file) {
//         logger.error("No file provided");
//         throw new ErrorHandler(400, "No file provided.");
//     }

//     if (file.size > maxFileSize) {
//         logger.error(`File size too large: ${file.size}`);
//         throw new ErrorHandler(400, "File size too large. Must be under 5MB.");
//     }

//     if (!allowedTypes.includes(file.type)) {
//         logger.error(`Invalid file type: ${file.type}`);
//         throw new ErrorHandler(400, "Invalid file type. Only JPEG, PNG, WEBP, JPG, GIF are allowed.");
//     }
// };

// // Función para manejar la subida de la imagen de perfil
// async function handleProfileImageUpload(file, userToUpdate) {
//     if (userToUpdate.profileImage) {
//         const existingPath = path.join('uploads', 'users', 'staffs', userToUpdate.profileImage);
//         await fs.unlink(existingPath).catch(err => {
//             logger.error(`Error deleting existing file: ${err.message}`, { filePath: existingPath });
//         });
//     }
//     const extension = path.extname(file.originalFilename);
//     const newFileName = `${userToUpdate._id}-${Date.now()}${extension}`;
//     const uploadPath = path.join('uploads', 'users', 'staffs', newFileName);
//     try {
//         await fs.rename(file.path, uploadPath);
//         logAudit('UPLOAD_IMAGE', userToUpdate._id, userToUpdate._id, "UserProfileImage", "Low", "Profile image updated", userToUpdate.ipAddress);
//         return newFileName;
//     } catch (error) {
//         logger.error(`Failed to upload file: ${error.message}`, { filePath: file.path });
//         throw error;
//     }
// }

// const updateUserImage = async (req, res) => {
//     let file;
//     try {
//         const userIdToUpdate = req.params.id;
//         const isValidObjectId = (id) => {
//             return /^[0-9a-fA-F]{24}$/.test(id);
//         }
//         if (!isValidObjectId(userIdToUpdate)) {
//             throw new ErrorHandler(400, "Invalid user ID format.");
//         }
//         file = req.files.profileImage;
//         if (!file) {
//             throw new ErrorHandler(400, "No profile image file provided.");
//         }
//         validateProfileImage(file);
//         let userToUpdate = await User.findById(userIdToUpdate);
//         if (!userToUpdate) {
//             throw new ErrorHandler(404, "User not found.");
//         }
//         userToUpdate.profileImage = await handleProfileImageUpload(file, userToUpdate);
//         await userToUpdate.save();
//         res.status(200).json(handleSuccessfulResponse("Profile image updated successfully",
//             { profileImage: userToUpdate.profileImage }
//         ));
//     } catch (error) {
//         if (file && file.path) {
//             await fs.unlink(file.path).catch(err => {
//                 logger.error(`Error deleting file after failed upload: ${err.message}`, { filePath: file.path });
//             });
//         }
//         handleErrorResponse(error, req, res);
//     }
// };





// // UPDATE USER
// const updateUser = async function (req, res) {
//     try {
//         const emailAddress = req.user.emailAddress;
//         if (!emailAddress) {
//             console.log("🚀 ~ updateUser ~ req.user:", req.user)
//             return res.status(401).send({ message: "Access Denied" });
//         }
//         const UserIdToUpdate = req.params['id'];
//         let data = req.body;

//         const { error: validationError } = validateUser(data, { passwordRequired: false, idRequired: true });
//         if (validationError) {
//             throw new ErrorHandler(400, validationError.details[0].message);
//         }

//         let userToUpdate = await User.findById(UserIdToUpdate);
//         if (!userToUpdate) {
//             return res.status(404).send({
//                 message: "User not found.",
//                 data: undefined,
//             });
//         }

//         const fieldsToUpdate = [
//             "firstName", "lastName", "organizationName", "countryAddress",
//             "stateAddress", "emailAddress", "phoneNumber", "birthday",
//             "role", "groups", "identification", "additionalInfo",
//             "isActive"
//         ];
//         fieldsToUpdate.forEach(field => {
//             if (data.hasOwnProperty(field)) {
//                 userToUpdate[field] = data[field];
//             }
//         });

//         if (req.files && req.files.profileImage) {
//             userToUpdate.profileImage = await handleProfileImageUpload(req.files.profileImage, userToUpdate.profileImage);
//         }
//         // await userToUpdate.saveWithAudit(emailAddress);
//         const alertLevel = userData.determineAlertLevel('UPDATE');
//         await userToUpdate.saveWithAudit(emailAddress, 'UPDATE', alertLevel);
//         const filteredUserData = (({ password, __v, verification, authMethod, configurationToken, configurationTokenExpires, googleId, loginAttempts, passwordHistory, ...rest }) => rest)(userToUpdate.toObject());
//         res.status(200).json(handleSuccessfulResponse("User updated successfully", filteredUserData));
//     } catch (error) {
//         handleErrorResponse(error, res);
//     }
// };

// LIST USERS


// // DELETE USERS
// const deleteUser = async function (req, res) {
//     try {
//         const { id } = req.params;
//         const userToDelete = await User.findOneAndDelete({ _id: id });
//         if (!userToDelete) {
//             throw new ErrorHandler(404, "User not found");
//         }
//         const userId = req.user.sub;
//         await AuditLog.create({
//             action: 'DELETE',
//             by: userId,
//             targetDoc: userToDelete._id,
//             targetType: 'User',
//             details: {
//                 message: "User deleted successfully"
//             }
//         });

//         res.status(200).json(handleSuccessfulResponse("User deleted successfully", { id: userToDelete._id }));
//     } catch (error) {
//         handleErrorResponse(error, res);
//     }
// };

// DELETE USERS



// UPDATE USER ACTIVE STATUS
// const updateUserActiveStatus = async (req, res) => {
//     const { userId } = req.params;
//     const { isActive } = req.body; 
//     if (typeof isActive !== 'boolean') {
//         return res.status(400).json({ message: "Invalid isActive value." });
//     }

//     try {
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ message: "User not found." });
//         }

//         user.isActive = isActive;
//         await user.save();

//         res.status(200).json({ message: "User active status updated successfully." });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "An error occurred while updating the user active status." });
//     }
// };



// // UPDATE MULTIPLE USERS ACTIVE STATUS
// const updateMultipleUserActiveStatus = async (req, res) => {
//     try {
//         const { userIds, isActive } = req.body; // `userIds` debe ser un arreglo de IDs y `isActive` el nuevo estado

//         if (!Array.isArray(userIds)) {
//             return res.status(400).json({ message: "Invalid input: userIds must be an array." });
//         }

//         // Actualizar el estado isActive para todos los usuarios cuyos IDs estén en `userIds`
//         const updateResult = await User.updateMany(
//             { _id: { $in: userIds } }, // Seleccionar usuarios por IDs
//             { $set: { isActive } } // Establecer el nuevo estado isActive
//         );

//         // Verificar el resultado de la operación
//         if (updateResult.modifiedCount === 0) {
//             return res.status(404).json({ message: "No users updated. Check if the IDs are correct." });
//         }

//         res.status(200).json({ message: "Users updated successfully.", updatedCount: updateResult.modifiedCount });
//     } catch (error) {
//         console.error("Error updating multiple users:", error);
//         res.status(500).json({ message: "An error occurred while updating users." });
//     }
// };



// if (req.files?.profileImage) {
//     validateProfileImage(req.files.profileImage);
//     let profileImage_name = path.basename(req.files.profileImage.path);
//     userData.profileImage = profileImage_name;
// }
// Aquí usas la función handleProfileImageUpload

// if (req.files && req.files.profileImage) {
//     let img_path = req.files.profileImage.path;
//     let name = img_path.split("\\");
//     let profileImage_name = name[name.length - 1];
//     if (userToUpdate.profileImage) {
//         const existingProfileImagePath = `uploads/users/staff${userToUpdate.profileImage}${userToUpdate.profileImage}`;
//         if (fs.existsSync(existingProfileImagePath)) {
//             fs.unlinkSync(existingProfileImagePath);
//         }
//     }
//     userToUpdate.profileImage = profileImage_name;
// }