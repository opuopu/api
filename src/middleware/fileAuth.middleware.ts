const jwt = require('jsonwebtoken')
import Response from '../utils/response.utils'
import Schema from '../models'
import express from 'express';
const {
    Admin,
} = Schema;
export const adminFileUploads = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const response = new Response()
    try {


        const token = req.headers.authorization;
        if (!token) {
            throw new Error("Access Denied")
        }

        const tokenData = jwt.decode(token)
        const admin = await Admin.findByPk(tokenData.user_id)
        if (!admin) {
            throw new Error("Access Denied")
        }

        if (Date.now() >= tokenData.exp * 1000) {
            response.message = 'Token is expired';
            return res.status(400).send(response.internalError)
        }

        jwt.verify(token, process.env.JWT_SECRET)

        req.admin = admin;

        next();

    } catch (e) {

        response.status = 403;
        response.success = false;
        response.message = 'Access Denied'
        return res.status(403).send(response.getResponse())
    }
}

export default adminFileUploads;