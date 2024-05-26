
// migrateRoles.js
const fs = require('fs');
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/userModel');
const logger = require('./helpers/logHelper');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

mongoose.connect(process.env.MONGODB_URI).then(() => {
    logger.info('Connected to the MongoDB database.');
    migrateUserRoles().then(() => {
        logger.info('Role migration complete.');
        process.exit();
    });
}).catch(err => {
    logger.error('Failed to connect to the database', err);
    process.exit(1);
});

async function migrateUserRoles() {
    try {
        const users = await User.find({
            $or: [
                { 'role.1': { $exists: true } },
                { 'role.0': { $exists: true } }
            ]
        });


        for (const user of users) {
            console.log("🚀 ~ migrateUserRoles ~ user:", user)
            user.role = user.role[0] || null; // Selecciona el primer rol si existe
            await user.save();
            logger.info(`Updated user ${user.userName} with single role.`);
        }
    } catch (error) {
        logger.error('Migration error:', error);
        process.exit(1);
    }
}
