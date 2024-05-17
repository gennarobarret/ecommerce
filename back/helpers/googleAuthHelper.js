"use strict";
require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


async function verifyGoogleToken(token) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        return ticket.getPayload(); 
    } catch (error) {
        console.error("Error verifying Google token:", error);
        throw error;
    }
}
module.exports = { verifyGoogleToken };