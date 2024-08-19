import express from 'express';
import Schema from '../models';
import responseUtils from '../utils/response.utils';

const {
    TopupOrderMessage
} = Schema;

class ProductController {

    getTopupOrderMessage = async (req: express.Request, res: express.Response) => {
        const response = new responseUtils()
        try {
            const topupOrderMessages = await TopupOrderMessage.findAll();
            response.data = topupOrderMessages;
            res.send(response.response);
        } catch (error) {
            console.log(error);
            res.status(500).json(response.internalError);
        }
    }

    
    adminStoreTopupOrderMessage = async (req: express.Request, res: express.Response) => {
        const response = new responseUtils()
        try {

            const topupOrderMessage = await TopupOrderMessage.create(req.body);
            response.data = topupOrderMessage;
            res.send(response.response);
            
        } catch (error) {
            console.log(error);
            res.status(400).send(response.internalError);
        }
    }

    adminDeleteTopupOrderMessage = async (req: express.Request, res: express.Response) => {
        const response = new responseUtils()
        try {
            const id = req.params.id
            const topupOrderMessage = await TopupOrderMessage.findByPk(id);
            if (!topupOrderMessage) {
                response.message = 'TopupOrderMessage not found'
                return res.status(400).send(response.response)
            }
            await topupOrderMessage.destroy();
            response.data = topupOrderMessage;
            res.send(response.response);
        } catch (error) {
            console.log(error);
            res.status(500).json(response.internalError);
        }
    }


}

export default new ProductController();