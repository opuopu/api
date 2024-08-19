import Schema from '../models';
import express from 'express'
import responseUtils from '../utils/response.utils';
import { Op, fn, col } from 'sequelize';

const {
  PaymentMethod,
  TopupPaymentMethod
} = Schema;

class PaymentMethodController {

  async getPaymentMethods(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const reqPath = req.protocol + "://" + req.get("host");

    const data = await PaymentMethod.findAll({
      attributes: {
        include: [
          "logo",
          [
            fn(
              "CONCAT",
              reqPath + "/images/",
              col("PaymentMethod.logo")
            ),
            "logo_full_url",
          ],
        ],
      }
    })
    response.data = data
    res.send(response.response)
  }

  async getPaymentMethodBYId(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const reqPath = req.protocol + "://" + req.get("host");

    const id = req.params.id
    const data = await PaymentMethod.findOne({
      where: {
        id,
      },
      attributes: {
        include: [
          "logo",
          [
            fn(
              "CONCAT",
              reqPath + "/images/",
              col("PaymentMethod.logo")
            ),
            "logo_full_url",
          ],
        ],
      }
    })

    if (!data) {
      response.status = 400;
      response.success = false;
      response.message = 'Payment method not found';
      return res.status(400).send(response.response)
    }

    response.data = data
    res.send(response.response)
  }

  async createPaymentMethod(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const { name, logo, info, status, is_automated } = req.body

    // const checkExist = await PaymentMethod.findAll({
    //   where: {
    //     [Op.or]: [
    //       {
    //         name: name
    //       },
    //       {
    //         info: info
    //       }
    //     ]
    //   }
    // })

    // if (checkExist?.length > 0) {
    //   response.status = 400;
    //   response.success = false;
    //   response.message = 'Payment method is already exist';
    //   return res.status(400).send(response.response)
    // }


    const data = await PaymentMethod.create({
      name,
      logo,
      info,
      is_automated,
      status
    })
    response.data = data
    res.send(response.response)
  }

  async updatePaymentMethod(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = req.params.id
    const { name, logo, info, status, is_automated } = req.body

    const paymentMethod = await PaymentMethod.findByPk(id)

    if (!paymentMethod) {
      response.status = 400;
      response.success = false;
      response.message = 'Payment method not found';
      return res.status(400).send(response.response)
    }

    // const checkExist = await PaymentMethod.findAll({
    //   where: {
    //     [Op.or]: [
    //       {
    //         name: name
    //       },
    //       {
    //         info: info
    //       }
    //     ]
    //   }
    // })

    // if (checkExist?.length > 1) {
    //   response.status = 400;
    //   response.success = false;
    //   response.message = 'Payment method is already exist';
    //   return res.status(400).send(response.response)
    // }

    paymentMethod.name = name;
    paymentMethod.logo = logo;
    paymentMethod.info = info;
    paymentMethod.status = status;
    paymentMethod.is_automated = is_automated;

    await paymentMethod.save();

    response.data = paymentMethod
    res.send(response.response)
  }

  async deletePaymentMethod(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = req.params.id

    await PaymentMethod.destroy({
      where: {
        id,
      }
    })

    response.message = 'Deleted successfully'
    res.send(response.response)
  }

  async topupPaymentMethods(req: express.Request, res: express.Response, next: express.NextFunction) {
    const response = new responseUtils()

    try {
      const data = await TopupPaymentMethod.findAll()
      response.data = data
      res.send(response.response)
    } catch (error) {
      return res.status(400).send(response.internalError)
    }
  }

  async activateTopupPaymentMethod(req: express.Request, res: express.Response, next: express.NextFunction) {
    const response = new responseUtils()

    try {
      const id = req.params.id
      const topupPaymentMethod = await TopupPaymentMethod.findByPk(id)

      if (!topupPaymentMethod) {
        response.status = 400;
        response.success = false;
        response.message = 'Payment method not found';
        return res.status(400).send(response.response)
      }
      topupPaymentMethod.is_active = 1;

      await topupPaymentMethod.save()

      response.message = 'Updated successfully'
      res.send(response.response)
    } catch (error) {
      return res.status(400).send(response.internalError)
    }
  }

  async inActivateTopupPaymentMethod(req: express.Request, res: express.Response, next: express.NextFunction) {
    const response = new responseUtils()

    try {
      const id = req.params.id
      const topupPaymentMethod = await TopupPaymentMethod.findByPk(id)

      if (!topupPaymentMethod) {
        response.status = 400;
        response.success = false;
        response.message = 'Payment method not found';
        return res.status(400).send(response.response)
      }
      topupPaymentMethod.is_active = 0;

      await topupPaymentMethod.save()

      response.message = 'Updated successfully'
      res.send(response.response)
    } catch (error) {
      res.status(400).send(response.internalError);
    }
  }

}

export default new PaymentMethodController();