const bcrypt = require('bcryptjs');
import crypto from 'crypto';
import express from 'express';
import { Op, Sequelize } from 'sequelize';
import axios from 'axios';
import Schema from '../models';
import { hasData } from '../utils/common.utils';
import responseUtils from '../utils/response.utils';
import urljoin from 'url-join';
const captchaVerify = require('../helpers/captcha_verify');
const smsHelper = require('../helpers/sms');
const {
  User,
  Banner,
  Notice,
  TopupProduct,
  Product,
  TopupPackage,
  PaymentMethod,
  Transaction,
  ProductOrder,
  Order,
  Otp,
  PasswordReset,
  TopupPaymentMethod,
  Inventorie,
  Voucher,
} = Schema;
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class UserController {
  async getUsers(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const query = req.query.q || '';

    const limit: any = parseInt(req.query.limit?.toString() || '20');
    const page: any = parseInt(req.query.page?.toString() || '1');

    const user_count = await User.count();

    const data = await User.findAll({
      offset: (page - 1) * limit,
      limit: limit,
      where: {
        [Op.or]: [
          {
            email: { [Op.like]: `%${query}%` },
          },
          {
            phone: { [Op.like]: `%${query}%` },
          },
          {
            id: { [Op.like]: `%${query}%` },
          },
        ],
      },
      // order: [
      //   ['created_at', 'DESC'],
      // ],
    });
    response.data = { data, user_count };
    res.send(response.response);
  }

  async updateUser(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const id = req.params.id;
    const { phone, wallet, address, city, zip_code, password } = req.body;

    console.log(req.body);

    const user = await User.findByPk(id);

    if (!user) {
      response.message = 'User not found to update';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }

    if (phone) {
      user.phone = phone;
    }
    if (wallet) {
      user.wallet = wallet;
    }
    user.address = address;
    user.city = city;
    user.zip_code = zip_code;
    if (password) {
      user.password = password;
    }
    await user.save();

    response.message = 'User updated successfully';
    res.send(response.response);
  }

  async getUserById(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const id = req.params.id;

    const data = await User.findByPk(id);

    if (!data) {
      response.message = 'User not found';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }

    response.data = data;
    res.send(response.response);
  }

  async deleteUser(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const id = req.params.id;

    const data = await User.destroy({
      where: {
        id,
      },
    });

    response.message = 'User deleted successfully';
    res.send(response.response);
  }

  getBanners = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const banners = await Banner.findAll({
        where: {
          isactive: 1,
        },
      });
      response.data = banners;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getNotices = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const notices = await Notice.findAll();
      response.data = notices;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getNoticModal = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const noticeType = req.query.type ?? 'popup';

      const notices = await Notice.findOne({
        where: {
          for_home_modal: 1,
          is_active: 1,
          type: noticeType,
        },
        order: [['id', 'ASC']],
      });
      response.data = notices || {};
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getTopupProducts = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const products = await TopupProduct.findAll({
        where: {
          is_active: 1,
        },
        order: [['sort_order', 'ASC']],
      });
      response.data = products;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getTopupPackagesByProductId = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    try {
      const product_id = req.params.id;

      const product = await TopupProduct.findByPk(product_id);

      if (!product) {
        response.message = 'TopupProduct not found';
        return res.status(400).send(response.internalError);
      }

      const packages = await TopupPackage.findAll({
        where: {
          product_id,
        },
        order: [['sort_order', 'ASC']],
      });

      if (product.topup_type === 'voucher') {
        for (const pack of packages) {
          pack.in_stock = 1;
          const voucher = await Voucher.findOne({
            where: {
              package_id: pack.id,
              is_used: 0,
            },
          });

          if (!voucher) {
            pack.in_stock = 0;
          }
        }
      }
      // response.data = { ...product, topuppackage: packages }
      response.data = { product, packages };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getPaymentMethod = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      const paymentMethods = await PaymentMethod.findAll({
        where: {
          status: 1,
        },
      });
      response.data = paymentMethods;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  userTransaction = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    const id = req.user.id;

    try {
      const limit: any = parseInt(req.query.limit?.toString() || '15');
      const page: any = parseInt(req.query.page?.toString() || '1');

      const totalCount = await Transaction.count({
        where: {
          user_id: id,
        },
      });

      const userTransactions = await Transaction.findAll({
        where: {
          user_id: id,
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [['id', 'DESC']],
      });

      response.data = {
        nextPage:
          parseInt(page) * parseInt(limit) < totalCount
            ? parseInt(page) + 1
            : undefined,
        data: userTransactions,
      };

      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  myOrder = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      const id = req.user.id;
      const limit: any = parseInt(req.query.limit?.toString() || '15');
      const page: any = parseInt(req.query.page?.toString() || '1');

      const totalCount = await Order.count({
        where: {
          user_id: id,
          payment_status: 1,
        },
      });

      const orders = await Order.findAll({
        where: {
          user_id: id,
          payment_status: 1,
        },
        include: [
          {
            model: TopupProduct,
          },
          {
            model: Voucher,
          },
        ],
        offset: (page - 1) * limit,
        limit: limit,
        order: [['created_at', 'DESC']],
      });

      response.data = {
        nextPage:
          parseInt(page) * parseInt(limit) < totalCount
            ? parseInt(page) + 1
            : undefined,
        data: orders,
      };

      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  orderDetailsById = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      const orderId: string = req.params.id as string;

      const order = await Order.findByPk(parseInt(orderId));

      if (order) {
        response.data = order;
      }

      console.log(order);

      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  topupPackageOrder = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const {
        topuppackage_id,
        product_id,
        accounttype,
        ingameid,
        ingamepassword,
        playerid,
        phone,
        payment_method,
        securitycode,
      } = req.body;

      let user_id = req.user.id;

      const topupPackage = await TopupPackage.findByPk(topuppackage_id);

      if (!topupPackage) {
        response.message = 'Topup package not found';
        return res.status(400).send(response.response);
      }

      let amount = parseInt(topupPackage.price);
      let buy_price = parseInt(topupPackage.buy_price);
      let admin_com = parseInt(topupPackage.admin_com)
        ? parseInt(topupPackage.admin_com)
        : 0;

      let product = await TopupProduct.findByPk(product_id);

      if (!product) {
        response.message = 'TopupProduct not found';
        return res.status(400).send(response.response);
      }
      if (product.is_active == 0) {
        response.message = 'TopupProduct is not available for order';
        return res.status(400).send(response.response);
      }

      const user = await User.findByPk(user_id);

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      let wallet = user.wallet;

      if (wallet < amount && parseInt(payment_method) === 1) {
        response.message = 'Not enough balance';
        return res.status(400).send(response.response);
      }

      let orderData: any = null;
      if (product.topup_type === 'voucher') {
        orderData = {
          topuppackage_id,
          product_id,
          name: topupPackage.name,
          status: 'pending',
          user_id,
          amount,
          buy_price,
        };
      } else {
        orderData = {
          topuppackage_id,
          product_id,
          name: topupPackage.name,
          accounttype,
          ingameid,
          ingamepassword,
          playerid,
          phone,
          securitycode,
          status: 'pending',
          user_id,
          amount,
          buy_price,
          admin_com,
        };
      }

      if (parseInt(payment_method) === 1) {
        // Updating user wallet
        if (wallet - amount >= 0) {
          user.wallet = user.wallet - amount;
        } else {
          user.wallet = 0;
        }

        await user.save();
        orderData.payment_mathod = 'wallet';
        orderData.payment_status = 1;
        const order = await Order.create(orderData);

        if (topupPackage.is_auto) {
          await this.emitAuto(topupPackage, order);
        }

        if (product.topup_type === 'voucher') {
          await this.emitProductVoucher(topupPackage, order, user);
        }

        response.data = order;

        response.message = 'Order placed successfully';
        return res.send(response.response);
      } else if (parseInt(payment_method) === 2) {
        orderData.payment_mathod = 'uddoktapay';
        orderData.payment_status = 0;

        const order = await Order.create(orderData);

        const obj = {
          full_name: user.username,
          email: user.email ?? 'abw123@gmail.com',
          amount: amount,
          metadata: {
            order_id: `p_${order.id}`,
            product_id,
          },
          redirect_url: urljoin(
            process.env.BACKEND_URL!,
            'api/v1/u-order-success',
          ),
          cancel_url: urljoin(
            process.env.BACKEND_URL!,
            'api/v1/u-order-cancel',
          ),
          webhook_url: urljoin(
            process.env.BACKEND_URL!,
            'api/v1/u-order-webhook',
          ),
        };
        console.log(process.env.ORDER_UPAN_URL!);

        const dataResponse = await axios.post(
          process.env.ORDER_UPAN_URL!,
          obj,
          {
            headers: {
              'Content-Type': 'application/json',
              'RT-UDDOKTAPAY-API-KEY': process.env.ORDER_UDDOKTA_API_KEY!,
            },
          },
        );
        console.log(dataResponse);
        response.data = {
          payment_url: dataResponse.data.payment_url,
        };

        return res.send(response.response);
      } else {
        response.message = 'Invalid payment method';
        return res.status(400).send(response.internalError);
      }
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  emitAuto = async (packages: any, order: any) => {
    const voucher = await Voucher.findOne({
      where: {
        is_used: 0,
        package_id: packages.voucher_id,
      },
      order: [['id', 'DESC']], // Adding order by id descending
    });

    if (voucher) {
      voucher.order_id = order.id;
      voucher.is_used = 1;
      await voucher.save();

      let rdata = {
        playerid: order.playerid.split(' ').join('').split('-').join(''),
        pacakge: packages.tag,
        code: voucher.data,
        orderid: order.id,
        url: 'https://api.rrrtopup.com/api/v1/completeorder',
      };
      let aaaa = await this.activeserverulr();
      axios.post(aaaa, rdata);
    }
    await order.save();

    return null;
  };

  activeserverulr = async () => {
    let activeserver = await PaymentMethod.findAll({
      where: {
        is_automated: 2,
      },
    });

    let allactiveserver = await PaymentMethod.findAll({
      where: {
        status: 2,
      },
    });

    if (allactiveserver.length == 0) {
      return 'no_active_server';
    }

    if (allactiveserver.length == 1) {
      return allactiveserver[0].name;
    } else if (activeserver.length == 0) {
      const paymentMethod = await PaymentMethod.findByPk(allactiveserver[0].id);
      if (paymentMethod) {
        paymentMethod.is_automated = 2;
        await paymentMethod.save();
      }
      return allactiveserver[0].name;
    } else {
      let nextItem;
      let found = false;

      for (let i = 0; i < allactiveserver.length; i++) {
        const currentItem = allactiveserver[i];

        if (currentItem.id === Number(activeserver[0].id)) {
          if (i < allactiveserver.length - 1) {
            nextItem = allactiveserver[i + 1];
            found = true;
          }
          break; // Found the item, no need to continue the loop
        }
      }

      if (found) {
        let singledata = await PaymentMethod.findByPk(nextItem?.id);
        if (singledata) {
          activeserver[0].is_automated = 1;
          activeserver[0].save();
          singledata.is_automated = 2;
          singledata.save();
        }
      } else {
        let singledata = await PaymentMethod.findByPk(allactiveserver[0].id);
        if (singledata) {
          activeserver[0].is_automated = 1;
          activeserver[0].save();
          singledata.is_automated = 2;
          singledata.save();
        }
      }
    }
    return activeserver[0].name;
  };

  completeorder = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    const { status, orderid } = req.body;
    console.log(orderid);
    let order = await Order.findByPk(orderid);
    if (status == 'success' && order) {
      order.status = 'completed';
      await order.save();
    } else if (order) {
      order.status = 'in_progress';
      await order.save();
    }
    return res.send(response.response);
  };

  emitProductVoucher = async (packages: any, order: any, user: any) => {
    const voucher = await Voucher.findOne({
      where: {
        is_used: 0,
        package_id: packages.id,
      },
    });

    if (!voucher) {
      await order.destroy();
      return 'No voucher avilable';
    }

    voucher.order_id = order.id;
    voucher.is_used = 1;
    await voucher.save();

    order.status = 'completed';
    await order.save();

    return null;
  };

  autoPaymentRepeatByUser = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();

    try {
      const transaction = await Transaction.findByPk(req.params.id);

      if (!transaction || transaction.status !== 'pending') {
        response.success = false;
        response.message = 'Transaction fail';
        return res.status(400).send(response.response);
      }

      const user = await User.findByPk(transaction.user_id);

      if (!user) {
        response.success = false;
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      const obj = {
        full_name: user.username,
        email: user.email ?? 'abw123@gmail.com',
        amount: transaction.amount,
        metadata: {
          order_id: transaction.id,
          product_id: `${+new Date()}`,
        },
        redirect_url: urljoin(
          process.env.BACKEND_URL!,
          'api/v1/auto-payment-success',
        ),
        cancel_url: urljoin(
          process.env.BACKEND_URL!,
          'api/v1/auto-payment-cancel',
        ),
        webhook_url: urljoin(
          process.env.BACKEND_URL!,
          'api/v1/auto-wallet-payment',
        ),
      };

      const dataResponse = await axios.post(process.env.UPAN_URL!, obj, {
        headers: {
          'Content-Type': 'application/json',
          'RT-UDDOKTAPAY-API-KEY': process.env.UDDOKTA_API_KEY!,
        },
      });

      response.data = {
        payment_url: dataResponse.data.payment_url,
      };

      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  autoPaymentCancelByUser = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();

    try {
      const transaction = await Transaction.findByPk(req.params.id);

      if (!transaction || transaction.status !== 'pending') {
        response.success = false;
        response.message = 'Transaction fail or already cancel';
        return res.status(400).send(response.response);
      }

      transaction.status = 'cancel';

      await transaction.save();

      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  autoPaymentSuccess = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      return res.redirect(urljoin(process.env.SITE_URL!, 'wallet'));
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  autoPaymentCancel = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      return res.redirect(urljoin(process.env.SITE_URL!, 'wallet'));
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  autoWalletPayment = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      const apiKey =
        req.headers['rt-uddoktapay-api-key'] ||
        req.headers['RT-UDDOKTAPAY-API-KEY'];

      const transaction = await Transaction.findByPk(
        req.body.metadata.order_id,
      );

      if (!transaction) {
        response.success = false;
        response.message = 'Transaction fail';
        return res.status(400).send(response.response);
      }

      const user = await User.findByPk(transaction.user_id);

      if (!user) {
        response.message = 'User not found to update transaction';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      if (apiKey !== process.env.UDDOKTA_API_KEY) {
        response.success = false;
        response.message = 'Payment automation error';
        return res.status(400).send(response.response);
      }

      if (
        req.body.status == 'COMPLETED' &&
        transaction.status !== 'completed' &&
        transaction.status !== 'cancel'
      ) {
        const paymentMethods = await PaymentMethod.findAll({
          where: {
            status: 1,
          },
        });
        const method = paymentMethods.find(
          (methods) => methods.name.toLowerCase() === req.body.payment_method,
        );

        const TODAY_START = new Date().setHours(0, 0, 0, 0);
        const NOW = new Date().setHours(23, 59, 0, 0);

        const prevTransaction = await Transaction.findAll({
          where: {
            user_id: transaction.user_id,
            created_at: {
              [Op.gte]: TODAY_START,
              [Op.lte]: NOW,
            },
            status: 'completed',
            payment_method: 'bkash',
            number: {
              [Op.ne]: req.body.sender_number,
            },
          },
        });

        const numberList = prevTransaction.map((item) => item.number);
        numberList.push(req.body.sender_number);

        if (
          prevTransaction.length > 0 &&
          req.body.payment_method.toLowerCase() === 'bkash' &&
          new Set(numberList).size !== 1 &&
          process.env.TRANSACTION_CHECK === 'ON'
        ) {
          transaction.status = 'under_review';
        } else if (
          prevTransaction.reduce((total: any, item) => total + item.amount, 0) +
            transaction.amount >
            3000 &&
          req.body.payment_method.toLowerCase() === 'bkash' &&
          process.env.TRANSACTION_CHECK === 'ON'
        ) {
          transaction.status = 'under_review';
        } else {
          transaction.status = 'completed';
          user.wallet = user.wallet + transaction.amount;
          await user.save();
        }

        transaction.payment_method = req.body.payment_method.toLowerCase();
        transaction.number = req.body.sender_number;
        transaction.transaction_id = req.body.transaction_id;
        if (method) transaction.paymentmethod_id = method.id;

        transaction.save();
      }

      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  uOrderSuccess = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      return res.redirect(urljoin(process.env.SITE_URL!, 'profile/order'));
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  uOrderCancel = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      return res.redirect(urljoin(process.env.SITE_URL!, 'profile/order'));
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  uOrderWebhook = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const apiKey =
        req.headers['rt-uddoktapay-api-key'] ||
        req.headers['RT-UDDOKTAPAY-API-KEY'];

      const order = await Order.findByPk(
        req.body.metadata.order_id.replace('p_', ''),
      );

      if (!order) {
        console.error('Order not found');
        response.success = false;
        response.message = 'Order fail';
        return res.status(400).send(response.response);
      }

      const product = await TopupProduct.findByPk(order.product_id);

      const packages = await TopupPackage.findByPk(order.topuppackage_id);

      const user = await User.findByPk(order.user_id);

      if (!user) {
        console.error('User not found');
        response.message = 'User not found to update order';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      if (apiKey !== process.env.ORDER_UDDOKTA_API_KEY) {
        console.error('Api key doesnt match');
        response.success = false;
        response.message = 'Payment automation error';
        return res.status(400).send(response.response);
      }

      if (req.body.status == 'COMPLETED' && order.status == 'pending') {
        order.payment_status = 1;
        order.transaction_id = req.body.transaction_id;
        order.phone = req.body.sender_number;
        await order.save();

        if (packages?.is_auto) {
          await this.emitAuto(packages, order);
        }

        if (product?.topup_type === 'voucher') {
          this.emitProductVoucher(packages, order, user);
        }
      }
      return res.send(response.response);
    } catch (error) {
      console.error(error);
      res.status(400).send(response.internalError);
    }
  };

  addWallet = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const {
        purpose,
        amount,
        number,
        paymentmethod,
        transaction_id,
        captcha_token,
      } = req.body;

      let user_id = req.user.id;

      const user = await User.findByPk(user_id);

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      if (!user_id || amount < 0) {
        response.message = 'Please Refresh The Page And Send Again';
        return res.status(400).send(response.response);
      }

      const checkPendingOrder = await Transaction.count({
        where: {
          user_id,
          status: 'pending',
        },
      });

      const paymentMethods = await PaymentMethod.findByPk(paymentmethod);

      if (!paymentMethods) {
        response.success = false;
        response.message = 'Payment method not found';
        return res.status(400).send(response.response);
      }

      if (paymentMethods.is_automated != 1) {
        if (checkPendingOrder > 0) {
          response.message =
            'You have already a pending add money request. Please complete to request another one.';
          return res.status(400).send(response.response);
        }

        // Checking if has any previous transaction with this transaction id
        const alreadyHasTansactionId = await Transaction.findAll({
          where: {
            transaction_id,
          },
        });

        if (hasData(alreadyHasTansactionId)) {
          response.message =
            'An add money request alrady has been placed with this transaction id';
          return res.status(400).send(response.response);
        }
      }

      const createTransaction = await Transaction.create({
        user_id,
        purpose,
        amount,
        number,
        paymentmethod_id: paymentmethod,
        status: 'pending',
        transaction_id,
      });

      if (paymentMethods.is_automated == 1) {
        createTransaction.is_automated = 1;
        await createTransaction.save();
        const obj = {
          full_name: user.username,
          email: user.email ?? 'abw123@gmail.com',
          amount: amount,
          metadata: {
            order_id: createTransaction.id,
            product_id: `${+new Date()}`,
          },
          redirect_url: urljoin(
            process.env.BACKEND_URL!,
            'api/v1/auto-payment-success',
          ),
          cancel_url: urljoin(
            process.env.BACKEND_URL!,
            'api/v1/auto-payment-cancel',
          ),
          webhook_url: urljoin(
            process.env.BACKEND_URL!,
            'api/v1/auto-wallet-payment',
          ),
        };

        const dataResponse = await axios.post(process.env.UPAN_URL!, obj, {
          headers: {
            'Content-Type': 'application/json',
            'RT-UDDOKTAPAY-API-KEY': process.env.UDDOKTA_API_KEY!,
          },
        });

        response.data = {
          payment_url: dataResponse.data.payment_url,
        };
      }

      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  userProfile = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    const id = req.user.id;
    try {
      const user = await User.findByPk(id);

      if (!user) {
        response.message = 'No user found';
        return res.status(400).send(response.response);
      }

      response.data = user;
      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  myStat = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    const id = req.user.id;
    try {
      const user = await User.findByPk(id);

      if (!user) {
        response.message = 'No user found';
        return res.status(400).send(response.response);
      }

      const userStat: any = {};

      const totalSpend = await Order.sum('amount', {
        where: {
          user_id: id,
          status: 'completed',
        },
      });

      const totalOrder = await Order.count({
        where: {
          user_id: id,
          status: 'completed',
        },
      });

      userStat['total_spend'] = totalSpend;
      userStat['total_order'] = totalOrder;

      response.data = userStat;
      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  resetPassword = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const { token, password, confirm_password } = req.body;
      const passwordReset = await PasswordReset.findOne({
        where: {
          token: { [Op.like]: `%${token}%` },
        },
        order: [['id', 'DESC']],
      });

      if (!passwordReset) {
        response.message = 'Invaild Token';
        return res.status(400).send(response.response);
      }

      const currTime = new Date();
      const otpTime = new Date(passwordReset.created_at);
      const diffTime = currTime.getTime() - otpTime.getTime();
      if (diffTime > 600000) {
        // 10 min to expire token
        response.message = 'Expired token';
        return res.status(400).send(response.response);
      }

      if (!password) {
        response.message = 'New password required';
        return res.status(400).send(response.response);
      }

      if (password !== confirm_password) {
        response.message = 'Confrim password not match';
        return res.status(400).send(response.response);
      }

      const user = await User.findByPk(passwordReset.user_id);
      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      user.password = password;
      await user.save();

      response.message = 'Password reset Success';
      res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  };

  resetPasswordOtp = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      const otpCode = Math.floor(Math.random() * 90000) + 10000;
      await smsHelper(
        user.phone,
        `Your ${process.env.APP_NAME} OTP Code is ` + otpCode,
      );

      await Otp.create({
        user_id: user.id,
        otp: otpCode,
        type: 'reset_password',
      });

      response.data = { action: 'reset_password' };

      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  async resetPasswordVerify(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      // let otp = await Otp.query()
      //   .where({ 'user_id': user.id, type: 'reset_password' })
      //   .last();
      let otp = await Otp.findOne({
        where: {
          user_id: user.id,
          type: 'reset_password',
        },
        order: [['id', 'DESC']],
      });

      if (!otp) {
        response.message = 'Invalid Otp';
        return res.status(400).send(response.response);
      }

      if (otp.otp != req.body.otp) {
        response.message = 'Invalid Otp';
        return res.status(400).send(response.response);
      }

      const currTime = new Date();
      const otpTime = new Date(otp.created_at);
      const diffTime = currTime.getTime() - otpTime.getTime();
      if (diffTime > 600000) {
        // 10 min to expire otp
        response.message = 'Otp is expired, Please resend otp code';
        return res.status(400).send(response.response);
      }

      const token = crypto.randomBytes(40).toString('hex');

      const returnData = await PasswordReset.create({
        user_id: user.id,
        token,
      });

      response.data = { reset_token: returnData.token };

      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async getActivePaymentMethods(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const topupPaymentMethods = await TopupPaymentMethod.findAll({
        where: {
          is_active: 1,
        },
      });
      const payments = topupPaymentMethods.map((data) => data.payment_method);
      response.data = payments;

      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async changePhone(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { phone } = req.body;
      const id = req.user.id;
      let user = await User.findByPk(id);

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      user.phone = phone;
      if (user.phone !== phone) {
        user.is_phone_verify = 0;
      }
      await user.save();
      response.message = 'Phone changed successfully';
      res.send(response.response);
    } catch (error) {
      res.status(500).send(response.internalError);
    }
  }

  async verifyPhone(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const id = req.user.id;
      const otpCode = Math.floor(Math.random() * 90000) + 10000;

      let user = await User.findByPk(id);

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      await Otp.create({
        user_id: id,
        otp: otpCode,
        type: 'phone_verify',
      });
      await smsHelper(
        user.phone,
        `Your ${process.env.APP_NAME} OTP Code is ` + otpCode,
      );

      res.send({ action: 'phone_verify' });
    } catch (error) {
      res.status(500).send(response.internalError);
    }
  }

  async verifyOtp(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { otp } = req.body;
      const id = req.user.id;
      let user = await User.findByPk(id);

      // let otp = await Otp.query().where('user_id', user.id).last();
      let findOtp = await Otp.findOne({
        where: {
          user_id: id,
        },
        order: [['created_at', 'DESC']],
      });

      if (!findOtp || !user) {
        response.message = 'Failed to verify your otp';
        return res.status(400).send(response.response);
      }

      if (findOtp.otp != otp) {
        response.message = 'Invalid Otp';
        return res.status(400).send(response.response);
      }

      const currTime = new Date();
      const otpTime = new Date(otp.created_at);
      const diffTime = currTime.getTime() - otpTime.getTime();
      if (diffTime > 600000) {
        // 10 min to expire otp
        response.message = 'Expired Otp';
        return res.status(400).send(response.response);
      }

      if (findOtp.type === 'phone_verify') {
        user.is_phone_verify = 1;
        await user.save();
      }

      response.message = 'OTP verified successfully';
      res.send(response.response);
    } catch (error) {
      res.status(500).send(response.internalError);
    }
  }

  async getInventories(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const limit: any = parseInt(req.query.limit?.toString() || '10');
      const data = await Inventorie.findAll({
        limit: limit,
      });

      response.data = data;
      res.send(response.response);
    } catch (error) {
      res.status(500).send(response.internalError);
    }
  }

  async getInventoriesById(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const id = req.params.id;

      const data = await Inventorie.findByPk(id);

      if (!data) {
        response.message = 'TopupProduct not found';
        return res.status(400).send(response.response);
      }
      response.data = data;
      res.send(response.response);
    } catch (error) {
      res.status(500).send(response.internalError);
    }
  }

  async cartProducts(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const ids = (req.query?.product_ids as any).split(',');
      const data = await Inventorie.findAll({
        where: {
          id: ids,
        },
      });

      response.data = data;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }
  async resetPasswordDirect(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { identity, captcha_token } = req.body;

      const isVerify = await captchaVerify(
        captcha_token,
        req.socket.remoteAddress,
      );

      if (!isVerify) {
        response.message = 'Invalid Captcha.';
        return res.status(400).send(response.internalError);
      }

      const user: any = await User.findOne({
        attributes: ['id', 'phone'],
        where: {
          ...(isNaN(identity)
            ? {
                email: identity,
              }
            : {
                phone: identity,
              }),
        },
      });

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.internalError);
      }

      if (!user?.phone) {
        response.message =
          'You do not have any phone number connected with your account, Please contact us.';
        return res.status(400).send(response.internalError);
      }

      const otpCode = Math.floor(Math.random() * 90000) + 10000;
      await smsHelper(
        user.phone,
        `Your ${process.env.APP_NAME} OTP Code is ` + otpCode,
      );

      await Otp.create({
        user_id: user.id,
        otp: otpCode,
        type: 'reset_password',
      });

      const user_phone: string = user.phone;
      const splitPhone = user_phone.split('');
      const firstPartOfNumber = splitPhone.slice(0, 3).join('');
      const lastPartOfNumber = splitPhone
        .slice(Math.max(user_phone.length - 3, 1))
        .join('');
      const startCount =
        user_phone.length -
        (firstPartOfNumber.length + lastPartOfNumber.length);
      const stars = [...new Array(startCount)].map((e) => '*').join('');
      const hiddenPhone = firstPartOfNumber + stars + lastPartOfNumber;

      delete user.phone;

      response.data = {
        user: user,
        starsPhone: hiddenPhone,
      };
      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }
  productOrder = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const productId = req.body.product_id;
      const user = await User.findByPk(req.user.id);

      const product = await Product.findByPk(productId);

      if (!product) {
        response.message = 'Product not found';
        return res.status(400).send(response.response);
      }
      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      if (product.quantity <= 0) {
        response.message = 'Product is stock out';
        return res.status(400).send(response.response);
      }

      if (user.wallet < product.sale_price) {
        response.message = 'You do not have enough money';
        return res.status(400).send(response.response);
      }

      product.quantity = product.quantity - 1;

      user.wallet = user.wallet - product.sale_price;
      await user.save();
      await product.save();

      await ProductOrder.create({
        product_id: product.id,
        user_id: user.id,
        amount: product.sale_price,
        status: 'pending',
      });

      response.message = 'Order placed successfully';
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getMyShopList = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const limit: any = parseInt(req.query.limit?.toString() || '15');
      const page: any = parseInt(req.query.page?.toString() || '1');

      const userId = req.user.id;
      const totalCount = await ProductOrder.count({
        where: {
          user_id: userId,
        },
      });
      const shopLists = await ProductOrder.findAll({
        where: {
          user_id: userId,
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [['id', 'DESC']],
        include: [
          // {
          //     model: User,
          // },
          {
            model: Product,
          },
        ],
      });

      response.data = {
        nextPage:
          parseInt(page) * parseInt(limit) < totalCount
            ? parseInt(page) + 1
            : undefined,
        data: shopLists,
      };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getUserTotalSpentAndTotalOrderCount = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    const id = req.user.id;

    try {
      const totalOrders = await Order.count({
        where: {
          user_id: id,
        },
      });

      // for (let i = 0; i < orders.length; i++) {
      //   if (orders[i].status === 'completed') {
      //     sum += parseFloat(orders[i].amount);
      //   }
      // }

      const totalSpent = await Order.sum('amount', {
        where: {
          user_id: id,
          status: 'completed',
        },
      });

      response.data = { totalOrders, totalSpent };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  async changePassword(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const { old_password, new_password, confirm_password } = req.body;
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.internalError);
      }

      if (new_password !== confirm_password) {
        response.message = 'New and confirm password not matched';
        return res.status(400).send(response.internalError);
      }

      const isVerified = await bcrypt.compare(old_password, user.password);

      if (!isVerified) {
        response.message = 'Password not matched';
        return res.status(400).send(response.internalError);
      }
      user.password = confirm_password;
      await user.save();

      response.message = 'Password changed';
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  // getMyShopList = async (req: express.Request, res: express.Response) => {
  //   const response = new responseUtils;
  //   try {

  //   } catch (error) {
  //     console.log(error)
  //     res.status(400).send(response.internalError)
  //   }

  // }
}

/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new UserController();
