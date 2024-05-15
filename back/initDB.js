// initDB.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Role = require("./models/roleModel");
const Permission = require("./models/permissionModel");
const logger = require('./helpers/logHelper');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

mongoose.connect(process.env.MONGODB_URI).then(() => {
    logger.info('Connected to the MongoDB database.');
    initializeRolesAndPermissions().then(() => {
        logger.info('Initialization complete.');
        process.exit();
    });
}).catch(err => {
    logger.error('Failed to connect to the database', err);
    process.exit();
});

async function initializeRolesAndPermissions() {
    try {
        const permissions = [
            { name: 'create_role', action: 'create', resource: 'role' },
            { name: 'read_roles', action: 'read', resource: 'role' },
            { name: 'update_role', action: 'update', resource: 'role' },
            { name: 'delete_role', action: 'delete', resource: 'role' },

            { name: 'create_permission', action: 'create', resource: 'permission' },
            { name: 'read_permissions', action: 'read', resource: 'permission' },
            { name: 'update_permission', action: 'update', resource: 'permission' },
            { name: 'delete_permission', action: 'delete', resource: 'permission' },

            { name: 'create_master_admin', action: 'create', resource: 'masterAdmin' },
            { name: 'create_user', action: 'create', resource: 'user' },
            { name: 'read_user', action: 'read', resource: 'user' },
            { name: 'read_user_by_id', action: 'read', resource: 'user' },
            { name: 'read_all_users', action: 'read', resource: 'user' },
            { name: 'read_user_image', action: 'read', resource: 'userImage' },
            { name: 'update_user', action: 'update', resource: 'user' },
            { name: 'delete_user', action: 'delete', resource: 'user' }
        ];

        for (let permission of permissions) {
            const permExists = await Permission.findOne({ name: permission.name });
            if (!permExists) {
                await Permission.create(permission);
            }
        }


        const roles = [
            { name: 'MasterAdministrator', permissions: [] },
        ];

        for (let role of roles) {
            const roleExists = await Role.findOne({ name: role.name });
            if (!roleExists) {
                if (role.name === 'MasterAdministrator') {
                    role.permissions = await Permission.find().select('_id');
                }
                await Role.create(role);
            }
        }
    } catch (error) {
        logger.error('Initialization error:', error);
        process.exit(1);
    }

}
