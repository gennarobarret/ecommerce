"use strict";

const express = require("express");
const userManagement = require("../controllers/PeopleController");
const auth = require("../middlewares/authenticate");
const multiparty = require('connect-multiparty');
const path = multiparty({ uploadDir: "./uploads/users/staffs" });
const api = express.Router();
const { createAdminLimiter } = require('../middlewares/rateLimit');
const rbac = require('../middlewares/rbacMiddleware');

api.post('/createMasterAdmin', userManagement.createMasterAdmin);
api.post("/createUser", [auth.auth, rbac('create', 'user'), path], userManagement.createUser);
api.get("/getUser", [auth.auth, rbac('read', 'user')], userManagement.getUser);
api.get("/getUserById/:id", [auth.auth, rbac('read', 'user')], userManagement.getUserById);
api.get("/listAllUsers", [auth.auth, rbac('read', 'user')], userManagement.listAllUsers);
api.get("/getUserImage/:profileImage", [auth.auth, rbac('read', 'userImage')], userManagement.getUserImage);
api.put("/updateUserInfo/:id", [auth.auth, rbac('update', 'user')], userManagement.updateUser);
api.put("/updateUserImage/:id", [auth.auth, rbac('update', 'user'), path], userManagement.updateUserImage);
api.patch("/updateUserActiveStatus/:userId", [auth.auth, rbac('update', 'user')], userManagement.updateUserActiveStatus);
api.patch("/updateMultipleUserActiveStatus", [auth.auth, rbac('update', 'user')], userManagement.updateMultipleUserActiveStatus);

module.exports = api;
