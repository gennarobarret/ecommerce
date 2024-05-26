const express = require('express');
const api = express.Router();
const geoController = require('../controllers/geoController');
const auth = require('../middlewares/authenticate');
const rbac = require('../middlewares/rbacMiddleware');

api.get('/countries', [auth.auth, rbac('read', 'geo')], geoController.getAllCountries);
api.get('/states', [auth.auth, rbac('read', 'geo')], geoController.getAllStates);
api.get('/states/country/:countryId', [auth.auth, rbac('read', 'geo')], geoController.getStatesByCountry);

module.exports = api;
