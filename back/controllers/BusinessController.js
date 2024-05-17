const Business = require("../models/businessModel");
const { ErrorHandler, handleErrorResponse, handleSuccessfulResponse } = require("../helpers/responseManagerHelper");
const logger = require('../helpers/logHelper');

const handleControllerError = (error, res) => {
    logger.error('controller error:', error);
    if (!(error instanceof ErrorHandler)) {
        error = new ErrorHandler(500, error.message || "Server error");
    }
    handleError(error, res);
};

// CREATE BUSINESS CONFIGURATION
const createBusiness = async (req, res) => {
    try {
        const businessConfigData = req.body;
        const businessConfig = new Business(businessConfigData);
        await businessConfig.save();
        res.status(201).json(handleSuccessfulResponse("Business configuration created successfully.", { businessConfigId: businessConfig._id }));
    } catch (error) {
        logger.error('createBusiness error:', error);
        handleErrorResponse(error, req, res);
    }
};

// UPDATE BUSINESS CONFIGURATION
const updateBusiness = async (req, res) => {
    try {
        const { businessConfigId } = req.params;
        const updateData = req.body;
        const businessConfig = await Business.findByIdAndUpdate(businessConfigId, updateData, { new: true });
        if (!businessConfig) {
            throw new ErrorHandler(404, "Business configuration not found.");
        }
        res.status(200).json(handleSuccessfulResponse("Business configuration updated successfully.", { businessConfig }));
    } catch (error) {
        logger.error('updateBusiness error:', error);
        handleErrorResponse(error, req, res);
    }
};

// GET BUSINESS CONFIGURATION
const getBusiness = async (req, res) => {
    try {
        const businessConfig = await Business.findOne(); // Assuming there's only one business config
        if (!businessConfig) {
            throw new ErrorHandler(404, "Business configuration not found.");
        }
        res.status(200).json(handleSuccessfulResponse("Business configuration retrieved successfully.", { businessConfig }));
    } catch (error) {
        logger.error('getBusiness error:', error);
        handleErrorResponse(error, req, res);
    }
};

module.exports = {
    createBusiness,
    updateBusiness,
    getBusiness
};
