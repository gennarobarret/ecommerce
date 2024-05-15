// initialConfigController.js
const User = require("../models/userModel");
const Business = require("../models/businessModel");
const Role = require("../models/roleModel");
const Permission = require("../models/permissionModel");

const { ErrorHandler, handleError } = require("../helpers/errorHandler");
const { createSuccessfulResponse } = require("../helpers/responseHelper");
const logger = require('../helpers/logHelper');

const handleControllerError = (error, res) => {
    logger.error('controller error:', error);
    if (!(error instanceof ErrorHandler)) {
        error = new ErrorHandler(500, error.message || "Server error");
    }
    handleError(error, res);
};


// INITIAL CHECK CONFIG
const InitialCheck = async (req, res) => {
    try {
        // await initializeRolesAndPermissions();
        const masterAdminRole = await Role.findOne({ name: 'MasterAdministrator' });
        if (!masterAdminRole) {
            return res.status(200).json(createSuccessfulResponse("Initial setup required. No MasterAdmin role found.", {
                setupRequired: true,
                verificationRequired: true,
                masterAdminRequired: true
            }));
        }

        const masterAdminUser = await User.findOne({ role: masterAdminRole._id });

        if (!masterAdminUser) {
            return res.status(200).json(createSuccessfulResponse("Initial setup required. No MasterAdmin found.", {
                setupRequired: true,
                verificationRequired: true,
                masterAdminRequired: true
            }));
        }

        if (masterAdminUser.verification !== 'active') {
            return res.status(200).json(createSuccessfulResponse("MasterAdmin is not verified.", {
                setupRequired: true,
                verificationRequired: true,
                masterAdminRequired: false
            }));
        }

        return res.status(200).json(createSuccessfulResponse("System is fully configured and ready for use.", {
            setupRequired: false,
            verificationRequired: false,
            masterAdminRequired: false
        }));

    } catch (error) {
        // console.error(error);
        handleControllerError(error, res);
    }
};



module.exports = {
    InitialCheck
};


// // initialCofigController.js


// const Role = require("../models/roleModel");
// const Permission = require("../models/permissionModel");
// const User = require("../models/userModel");
// const Business = require("../models/businessModel");


// const { ErrorHandler, handleError } = require("../helpers/errorHandler");
// const { createSuccessfulResponse } = require("../helpers/responseHelper");
// const logger = require('../helpers/logHelper');

// const handleControllerError = (error, res) => {
//     logger.error('controller error:', error);
//     if (!(error instanceof ErrorHandler)) {
//         error = new ErrorHandler(500, error.message || "Server error");
//     }
//     handleError(error, res);
// }
// // INITIAL CHECK
// const InitialCheck = async (req, res) => {
//     try {
//         const user = await User.findOne({ role: 'MasterAdministrator' }, '-passwordHistory -emailNotifications -loginAttempts');
//         console.log("🚀 ~ InitialCheck ~ user:", user);
//         let masterAdminRequired = false;
//         let verificationRequired = false;
//         let setupRequired = false;
//         let message = "";
//         if (!user) {
//             message = "No MasterAdmin found, ready for initial setup";
//             setupRequired = true;
//             verificationRequired = true;
//             masterAdminRequired = true;
//         } else if (user.verification !== 'active') {
//             message = "MasterAdmin is not verified";
//             verificationRequired = true;
//             masterAdminRequired = false;
//         } else {
//             const infoFields = [user.identification, user.organizationName, user.stateAddress, user.countryAddress, user.additionalInfo];
//             const missingInfo = infoFields.some(field => !field);
//             const businessConfig = await Business.findOne();
//             if (missingInfo || !businessConfig) {
//                 message = missingInfo ? "Additional user information required for setup" : "Business configuration setup is required";
//                 setupRequired = true;
//                 masterAdminRequired = false; // Asume que un MasterAdmin ya está presente pero se requiere más configuración
//             } else {
//                 message = "Master Administrator is verified, all required user information and business configuration are present, ready for login";
//                 masterAdminRequired = false; // No se requiere un MasterAdmin adicional
//             }
//         }
//         res.status(200).json(createSuccessfulResponse(message, { setupRequired, verificationRequired, masterAdminRequired }));
//     } catch (error) {
//         handleControllerError(error, res);
//     }
// };

// module.exports = {
//     InitialCheck
// };
