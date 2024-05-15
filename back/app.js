require('dotenv').config();

'use strict';

const express = require('express');
const app = express();
const bodyparser = require('body-parser');
const mongoose = require('mongoose');
const port = process.env.PORT || 4201;

const initialConfigRoute = require('./routes/initialConfigRoute');
const authRoute = require('./routes/authRoute');
const userRoute = require('./routes/userRoute');
const roleRoute = require('./routes/roleRoute');
const permissionRoute = require('./routes/permissionRoute');
const businessRoute = require('./routes/businessRoute');
const auditLogsRoute = require('./routes/auditLogsRoute');

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        app.listen(port, function () {
            console.log('** Server online on port ' + port + '**');
        });
    })
    .catch((error) => {
        console.error('** Database Connection Failed:', + error + '**');
    });

// Parse incoming JSON objects
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json({ limit: '50mb', extended: true }));

// CORS permissions
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Access-Control-Allow-Request-Method'
    );
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Allow', 'GET, PUT, POST, DELETE, OPTIONS');
    next();
});

// Initialize routes
app.use('/api', authRoute);
app.use('/api', initialConfigRoute);
app.use('/api', userRoute);
app.use('/api', roleRoute);
app.use('/api', permissionRoute);
app.use('/api', businessRoute);
app.use('/api', auditLogsRoute);

module.exports = app;
