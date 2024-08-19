import axios from 'axios';
import express from 'express';
import { Op, fn, col, where } from 'sequelize';
import Schema from '../models';
import { sequelize } from '../models/Schemas';
import responseUtils from '../utils/response.utils';
const smsHelper = require('../helpers/sms');
const bcrypt = require('bcryptjs');
// import bcrypt from 'bcryptjs'

const orderSms = async (
  orderId: number,
  packageName: string,
  status: string,
  number: string,
) => {
  if (status === 'completed') {
    status = 'Completed';
  } else if (status === 'cancel') {
    status = 'Cancelled';
  }

  const text = `
  Dear Customer Your Order Has Been ${status}. 

Order Id - ${orderId} 
Pakage Name - ${packageName}

${process.env.APP_NAME}`;
  smsHelper(number, text);
};

const {
  User,
  Order,
  AuthModule,
  Admin,
  AdminAuth,
  TopupPackagePermission,
  Transaction,
  PaymentMethod,
  TopupProduct,
  TopupPackage,
  Voucher,
} = Schema;
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class AdminController {
  async publishPermission(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    res.send(response.getResponse());
  }

  async getOrders(req: express.Request, res: express.Response) {
    const { user_id, order_id, status } = req.query;
    const response = new responseUtils();
    const filter: any = {};

    filter.payment_status = 1;

    if (user_id) {
      filter.user_id = user_id;
    }
    if (order_id) {
      filter.id = order_id;
    }

    if (status) {
      filter.status = status;
    }

    const limit: any = parseInt(req.query.limit?.toString() || '20');
    const page: any = parseInt(req.query.page?.toString() || '1');

    const orderCount = await Order.count({
      where: {
        ...filter,
      },
    });

    const orders = await Order.findAll({
      offset: (page - 1) * limit,
      limit: limit,
      where: {
        ...filter,
      },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Admin,
          attributes: ['first_name', 'last_name'],
        },
        {
          model: Voucher,
        },
      ],
    });

    response.data = { orders, order_count: orderCount };

    res.send(response.getResponse());
  }

  async updateOrderStatus(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const order_id = req.params.id;
    const admin = req.admin as any;
    const statusToUpdate = req.body.status;
    const orderNote = req.body.order_note;
    const completedById = admin.id;
    const order = await Order.findByPk(order_id);

    if (!order) {
      response.message = 'Order not found';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }

    if (!['pending', 'in_progress'].includes(order.status)) {
      response.message = `Order is not available for edit`;
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }

    const product = await TopupProduct.findByPk(order.product_id);
    const user = await User.findByPk(order.user_id);

    if (!user || !product) {
      response.message = `Something went wrong!`;
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
    if (statusToUpdate == 'cancel') {
      user.wallet = user.wallet + parseInt((order as any).amount);

      await product.save();
      await user.save();
    }

    const topupPackage = await TopupPackage.findByPk(order.topuppackage_id);

    try {
      if (
        ['completed', 'cancel'].includes(statusToUpdate) &&
        user.phone
      ) {
        orderSms(order.id, topupPackage!.name, statusToUpdate, user?.phone);
      }
    } catch (error) {
      console.log(error);
    }

    order.status = statusToUpdate;
    order.brief_note = orderNote;
    order.completed_by = completedById;
    await order.save();

    response.message = 'Order updated successfully';
    response.data = order;
    res.send(response.response);
  }

  async completeSelectedOrders(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const admin = req.admin as any;
    const statusToUpdate = 'completed';
    const completedById = admin.id;
    let totalCompleted = 0;

    for (const i of req.body.ordersId) {
      const order = await Order.findByPk(i);

      if (order && ['pending', 'in_progress'].includes(order.status)) {
        order.status = statusToUpdate;
        order.completed_by = completedById;
        await order.save();
        totalCompleted += 1;
      }
    }

    response.message = 'Order updated successfully';
    response.data = totalCompleted;
    res.send(response.response);
  }

  async getAdminOrders(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { user_id, status, order_id } = req.query;

      const adminId = req.admin.id;
      // const adminId = req.params.id;
      const filter: any = {};

      filter.payment_status = 1;

      if (user_id) {
        filter.user_id = user_id;
      }
      if (order_id) {
        filter.id = order_id;
      }

      if (status) {
        filter.status = status;
      }

      const limit: any = parseInt(req.query.limit?.toString() || '20');
      const page: any = parseInt(req.query.page?.toString() || '1');

      const packagesForAdmin = await TopupPackagePermission.findAll({
        where: {
          admin_id: adminId,
        },
        raw: true,
        attributes: ['topup_package_id'],
      });

      const bindPackageIdInArray = packagesForAdmin.map((pack) =>
        pack.topup_package_id.toString(),
      );

      if (bindPackageIdInArray.length <= 0) {
        response.message = 'No order found';
        response.status = 400;
        response.success = true;
        return res.status(400).send(response.response);
      }

      const orderCount = await Order.count({
        where: {
          topuppackage_id: bindPackageIdInArray,
          ...filter,
        },
      });

      const getAdminOrdersByPackageId = await Order.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: {
          topuppackage_id: bindPackageIdInArray,
          ...filter,
        },
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Admin,
            attributes: ['first_name', 'last_name'],
          },
        ],
      });

      response.data = {
        orders: getAdminOrdersByPackageId,
        order_count: orderCount,
      };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  async getAuthModules(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    // const limit: any = parseInt(req.query.limit?.toString() || '20')
    // const page: any = parseInt(req.query.page?.toString() || '1')

    // const auths = await AuthModule.findAll({
    //   offset: (page - 1) * limit,
    //   limit: limit,
    // })

    const auths = await AuthModule.findAll();

    response.data = auths;
    res.send(response.getResponse());
  }

  async activeAuthModules(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    try {
      const id: string = req.params.id;

      const authModule = await AuthModule.findByPk(id);

      if (!authModule) {
        response.message = 'Auth module not found';
        response.status = 400;
        response.success = false;
        return res.send(response.response);
      }

      if (authModule.status == 1) {
        response.status = 400;
        response.message = 'Auth module is already activated';
        response.success = false;
        return res.status(400).send(response.response);
      }

      authModule.name = req.body.name;
      authModule.description = req.body.description || '';
      authModule.slug = req.body.slug;
      authModule.description = req.body.description || '';
      authModule.status = 1;
      await authModule.save();

      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  async addAdminPermission(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const auths = await AuthModule.findByPk(req.body.auth_module_id);
      const admin = await Admin.findByPk(req.body.admin_id);
      if (!auths || !admin) {
        response.status = 400;
        response.message = 'Something went wrong';
        response.success = true;
        return res.status(400).send(response.getResponse());
      }

      const existsPermission = await AdminAuth.findOne({
        where: {
          admin_id: req.body.admin_id,
          auth_module_id: req.body.auth_module_id,
        },
      });

      if (existsPermission) {
        response.status = 400;
        response.message = 'Permission Already Applied';
        response.success = true;
        return res.status(400).send(response.getResponse());
      }

      await AdminAuth.create({
        admin_id: req.body.admin_id,
        auth_module_id: req.body.auth_module_id,
      });

      res.send(response.getResponse());
    } catch (error) {
      console.log(error);
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true;
      return res.status(400).send(response.getResponse());
    }
  }

  async getAdmins(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const limit: any = parseInt(req.query.limit?.toString() || '20');
      const page: any = parseInt(req.query.page?.toString() || '1');

      const admins = await Admin.findAll({
        offset: (page - 1) * limit,
        limit: limit,
      });

      response.data = admins;
      res.status(200).send(response.response);
    } catch (error) {
      console.log(error);
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true;
      return res.status(400).send(response.getResponse());
    }
  }

  async deleteAdmin(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const id = req.params.id;
    try {
      await Admin.destroy({
        where: {
          id,
        },
      });

      response.message = 'Admin deleted.';
      res.status(200).send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  }

  async getAdminById(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const id = req.params.id;
    try {
      const admin = await Admin.findOne({
        where: {
          id,
        },
      });

      if (!admin) {
        response.message = 'Admin not found';
        response.success = false;
        response.status = 400;
        return res.status(400).send(response.response);
      }

      response.data = admin;
      res.status(200).send(response.response);
    } catch (error) {
      console.log(error);
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true;
      return res.status(400).send(response.getResponse());
    }
  }

  async getAdminAuthById(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const adminId = req.params.id;

      if (!adminId) throw new Error('Access Denied');
      const admin = await Admin.findByPk(adminId);

      if (!admin) {
        response.message = 'Admin not found';
        response.success = false;
        response.status = 400;
        return res.status(400).send(response.response);
      }

      const authsFromAdmin = await AdminAuth.findAll({
        where: {
          admin_id: adminId,
        },
        attributes: ['auth_module_id'],
      });

      const authsOnlyArray = authsFromAdmin.map((ath) => ath.auth_module_id);

      response.data = authsOnlyArray;
      res.status(200).send(response.response);
    } catch (error) {
      console.log(error);
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true;
      return res.status(400).send(response.getResponse());
    }
  }

  async updateAdminAuth(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const adminId = req.body.admin_id;
      const authIds = req.body.auth_ids;

      await AdminAuth.destroy({
        where: {
          admin_id: adminId,
        },
      });

      if (authIds.length > 0) {
        for (let authId of authIds) {
          await AdminAuth.create({
            auth_module_id: authId,
            admin_id: adminId,
          });
        }
      }

      res.status(200).send(response.response);
    } catch (error) {
      console.log(error);
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true;
      return res.status(400).send(response.getResponse());
    }
  }

  getAllAutomatedTransaction = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    try {
      const userId = req.query.user_id || '';
      const status = req.query.status || '';
      const transactionId = req.query.transaction_id || '';
      const orderId = req.query.order_id || '';
      const phone = req.query.phone || '';

      const limit: any = parseInt(req.query.limit?.toString() || '20');
      const page: any = parseInt(req.query.page?.toString() || '1');

      const whereQuery: any = {
        is_automated: 1, // default ignore automated payment
        [Op.and]: [
          {
            user_id: { [Op.like]: `%${userId}%` },
          },
          {
            transaction_id: { [Op.like]: `%${transactionId}%` },
          },
          {
            id: { [Op.like]: `%${orderId}%` },
          },
          {
            number: { [Op.like]: `%${phone}%` },
          },
        ],
      };

      if (status) {
        whereQuery['status'] = status;
      }

      const totalRow = await Transaction.count({
        where: whereQuery,
      });
      const transactions = await Transaction.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        include: [
          {
            model: PaymentMethod,
          },
        ],
        where: whereQuery,
        order: [['created_at', 'DESC']],
      });
      response.data = { transactions, total: totalRow };
      res.status(200).send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  };

  async getAllTransaction(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const query = req.query.q || '';

    const limit: any = parseInt(req.query.limit?.toString() || '20');
    const page: any = parseInt(req.query.page?.toString() || '1');

    const whereQuery = {
      is_automated: 0, // default ignore automated payment
      [Op.or]: [
        {
          number: { [Op.like]: `%${query}%` },
        },
        {
          user_id: { [Op.like]: `%${query}%` },
        },
        {
          transaction_id: { [Op.like]: `%${query}%` },
        },
      ],
    };

    try {
      const totalRow = await Transaction.count({
        where: whereQuery,
      });
      const transactions = await Transaction.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        include: [
          {
            model: PaymentMethod,
          },
        ],
        where: whereQuery,
        order: [['created_at', 'DESC']],
      });
      response.data = { transactions, total: totalRow };
      res.status(200).send(response.response);
    } catch (error) {
      console.log(error);
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true;
      return res.status(400).send(response.getResponse());
    }
  }

  async getTransactionById(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const id = req.params.id;

    try {
      const transaction = await Transaction.findByPk(id);

      if (!transaction) {
        response.message = 'Transaction not found';
        return res.status(400).send(response.internalError);
      }

      response.data = transaction;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  }

  async updateTransaction(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const transactionId = parseInt(req.body.transaction_id);
    var status = req.body.status;

    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
      response.message = 'Transaction not found';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }

    let user = await User.findByPk(transaction.user_id);

    if (!user) {
      response.message = 'User not found to update transaction';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }

    if (
      status == 'completed' &&
      ['pending', 'under_review'].includes(transaction.status)
    ) {
      user.wallet = user.wallet + transaction.amount;
      await user.save();
    }

    transaction.status = status;
    await transaction.save();

    response.message = 'Transaction updated successfully';

    // await sleep(2000)
    res.send(response.response);
  }

  async completeSelectedlAllTransaction(
    req: express.Request,
    res: express.Response,
  ) {
    const response = new responseUtils();
    const transactionIds = req.body.transaction_ids;
    var status = 'completed';

    let totalUpdated = 0;

    for (const i of transactionIds) {
      const transaction = await Transaction.findByPk(i);

      if (!transaction) {
        response.message = 'Transaction not found';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }
      let user = await User.findByPk(transaction.user_id);

      if (!user) {
        response.message = 'User not found to update transaction';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      if (
        status == 'completed' &&
        transaction.purpose == 'addwallet' &&
        transaction.status == 'pending'
      ) {
        user.wallet = user.wallet + transaction.amount;
        totalUpdated += 1;
        await user.save();
      }

      transaction.status = status;
      await transaction.save();
    }

    response.data = totalUpdated;

    // await sleep(2000)
    res.send(response.response);
  }

  async updateTransactionFullRow(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const id = req.params.id;
    const { amount, status, number } = req.body;

    const transaction = await Transaction.findByPk(id);

    if (!transaction) {
      response.message = 'Transaction not found';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }

    transaction.amount = parseInt(amount);
    transaction.number = number;
    if (transaction.status === 'cancel') transaction.status = status;
    await transaction.save();

    res.send(response.response);
  }

  async cancelAllTransaction(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    try {
      const totalCount = await Transaction.count({
        where: { status: 'pending' },
      });
      await Transaction.update(
        {
          status: 'cancel',
        },
        {
          where: {
            status: 'pending',
          },
        },
      );

      response.message = 'All pending transaction cancelled successfully';
      response.data = { total: totalCount };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  checkUsername = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    const username = req.params.username;
    const user = await Admin.findOne({
      where: {
        username,
      },
    });

    if (user) {
      response.message = 'Username already Exist';
      response.data = { status: 'NOT_AVAILABLE' };
    } else {
      response.data = { status: 'AVAILABLE' };
    }

    res.send(response.response);
  };

  async createNewAdmin(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const {
        first_name,
        last_name,
        username,
        gender,
        date_of_birth,
        email,
        phone,
        password,
      } = req.body;

      const adminByEmail = await Admin.findOne({
        where: {
          email,
        },
      });

      if (adminByEmail) {
        response.message = 'Email Already Exists';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      const adminByUsername = await Admin.findOne({
        where: {
          username,
        },
      });

      if (adminByUsername) {
        response.message = 'Username Already Exists';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      const admin = new Admin();
      admin.first_name = first_name;
      admin.last_name = last_name;
      admin.username = username;
      admin.email = email;
      admin.password = password;

      if (gender) {
        admin.gender = gender;
      }

      if (phone) {
        admin.phone = phone;
      }

      await admin.save();
      response.message = 'Admin Created Success';
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async changePassword(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const { old_password, new_password, confirm_password } = req.body;
    try {
      const admin = await Admin.findByPk(req.admin.id);

      if (!admin) {
        response.message = 'Admin not found';
        return res.status(400).send(response.internalError);
      }

      if (new_password !== confirm_password) {
        response.message = 'New and confirm password not matched';
        return res.status(400).send(response.internalError);
      }

      const isVerified = await bcrypt.compare(old_password, admin.password);

      if (!isVerified) {
        response.message = 'Password not matched';
        return res.status(400).send(response.internalError);
      }
      admin.password = confirm_password;
      await admin.save();

      response.message = 'Password changed';
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  orderCompletedByAdmin = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();

    try {
      const dataForm = [];
      const admins = await Admin.findAll();
      const currentDate = new Date();
      for (const admin of admins) {
        const adminObj: any = admin.toJSON();
        const totalOrders = await Order.count({
          where: {
            completed_by: admin.id,
            status: 'completed',
          },
        });

        const todayOrder = await Order.count({
          where: {
            completed_by: admin.id,
            status: 'completed',
            [Op.and]: [
              where(
                fn(
                  'date',
                  fn('CONVERT_TZ', col('created_at'), '+00:00', '+06:00'),
                ),
                currentDate.toLocaleDateString('fr-CA'),
              ),
            ],
          },
        });
        const currentMonth = currentDate.getMonth() + 1;
        const monthlyOrder = await Order.count({
          where: {
            completed_by: admin.id,
            status: 'completed',
            [Op.and]: [
              where(
                fn('DATE_FORMAT', col('created_at'), '%Y-%m'),
                `${currentDate.getFullYear()}-${
                  currentMonth > 9 ? currentMonth : '0' + currentMonth
                }`,
              ),
            ],
          },
        });

        adminObj.total_order = totalOrders;
        adminObj.today_order = todayOrder;
        adminObj.monthly_order = monthlyOrder;

        dataForm.push(adminObj);
      }

      response.data = dataForm;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  shellUsedByAdmin = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      const dataForm = [];
      const admins = await Admin.findAll();
      const currentDate = new Date();
      for (const admin of admins) {
        const adminObj: any = admin.toJSON();
        const todayShellUsed = await Order.sum('buy_price', {
          where: {
            completed_by: admin.id,
            status: 'completed',
            [Op.and]: [
              where(
                fn(
                  'date',
                  fn('CONVERT_TZ', col('updated_at'), '+00:00', '+06:00'),
                ),
                currentDate.toLocaleDateString('fr-CA'),
              ),
            ],
          },
        });

        const yesterDay = new Date();
        yesterDay.setDate(currentDate.getDate() - 1);
        const yesterdayShellUsed = await Order.sum('buy_price', {
          where: {
            completed_by: admin.id,
            status: 'completed',
            [Op.and]: [
              where(
                fn(
                  'date',
                  fn('CONVERT_TZ', col('updated_at'), '+00:00', '+06:00'),
                ),
                yesterDay.toLocaleDateString('fr-CA'),
              ),
            ],
          },
        });

        adminObj.today_shell_used = todayShellUsed;
        adminObj.yesterday_shell_used = yesterdayShellUsed;

        // console.log(adminObj);
        dataForm.push(adminObj);
      }

      response.data = dataForm;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };
  
  comByAdmin = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
	let dates = req.params.date;
	let enddate = req.params.enddate;
    try {
      const dataForm = [];
      const admins = await Admin.findAll();
      const currentDate = new Date(dates);
      const enddates = new Date(enddate);

      for (const admin of admins) {
        const adminObj: any = admin.toJSON();
        const todayShellUsed = await Order.sum('admin_com', {
          where: {
            completed_by: admin.id,
            status: 'completed',
			[Op.and]: [
				where(
					fn('date', fn('CONVERT_TZ', col('updated_at'), '+00:00', '+06:00')),
					{
						[Op.between]: [
							currentDate,
							enddates
						]
					}
				)
			]
          },
        });

        const yesterDay = new Date();
        yesterDay.setDate(currentDate.getDate() - 1);
        const yesterdayShellUsed = await Order.sum('admin_com', {
          where: {
            completed_by: admin.id,
            status: 'completed',
            [Op.and]: [
              where(
                fn(
                  'date',
                  fn('CONVERT_TZ', col('updated_at'), '+00:00', '+06:00'),
                ),
                yesterDay.toLocaleDateString('fr-CA'),
              ),
            ],
          },
        });

        adminObj.today_shell_used = todayShellUsed;
        adminObj.yesterday_shell_used = yesterdayShellUsed;

        // console.log(adminObj);
        dataForm.push(adminObj);
      }

      response.data = dataForm;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  async thisMonthCompledOrder(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const TODAY_START =
        new Date().setHours(0, 0, 0, 0) - 24 * 30 * 60 * 60 * 1000;
      const NOW = new Date().setHours(23, 59, 0, 0);

      const data = await Order.count({
        where: {
          status: 'completed',
          created_at: {
            [Op.gte]: new Date(TODAY_START),
            [Op.lte]: new Date(NOW),
          },
        },
      });

      response.data = data;
      res.send(response.getResponse());
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async getDashboardStats(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    try {
      const totalUser = await User.count();

      const TODAY_START = new Date().setHours(0, 0, 0, 0);
      const NOW = new Date().setHours(23, 59, 0, 0);

      const todaysOrder = await Order.count({
        where: {
          payment_status: 1,
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW,
          },
        },
      });

      const todaysCompletedOrder = await Order.count({
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW,
          },
        },
      });

      const todaysUser = await User.count({
        where: {
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW,
          },
        },
      });

      const todaySale = await Order.sum('amount', {
        where: {
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW,
          },
        },
      });

      const totalWallet = await User.sum('wallet');

      const todaysTotalWallet = await Transaction.sum('amount', {
        where: {
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW,
          },
        },
      });

      response.data = {
        totalUser,
        todaysOrder,
        todaySale,
        todaysCompletedOrder,
        totalWallet: totalWallet || 0,
        todaysTotalWallet: todaysTotalWallet || 0,
        todaysUser,
      };

      res.send(response.getResponse());
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async getOrderChartData(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    try {
      const dayToFetch = parseInt((req.query as any).days);

      const dataArray = [];
      const dateArray: string[] = [];

      const day = (day: number = 0) => {
        const minusOneDay = day === 0 ? 0 : 24 * day * 60 * 60 * 1000;
        const TODAY_START = new Date().setHours(0, 0, 0, 0) - minusOneDay;
        const NOW = new Date(TODAY_START).setHours(23, 59, 0, 0);

        dateArray.unshift(
          `${new Date(TODAY_START).getDate()} ${new Date(
            TODAY_START,
          ).toLocaleDateString('default', { month: 'short' })}`,
        );

        return {
          where: {
            payment_status: 1,
            created_at: {
              [Op.gte]: new Date(TODAY_START),
              [Op.lte]: new Date(NOW),
            },
          },
        };
      };

      for (const i of [...new Array(dayToFetch + 1 || 31).keys()]) {
        const data = await Order.count(day(i));
        dataArray.unshift(data || 0);
      }

      response.data = {
        data: dataArray,
        dates: dateArray,
      };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async thisMonthSaleChartData(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    try {
      const dayToFetch = parseInt((req.query as any).days);

      const day = (day: number = 0) => {
        const minusOneDay = day === 0 ? 0 : 24 * day * 60 * 60 * 1000;
        const TODAY_START = new Date().setHours(0, 0, 0, 0) - minusOneDay;
        const NOW = new Date(TODAY_START).setHours(23, 59, 0, 0);

        dateArray.unshift(
          `${new Date(TODAY_START).getDate()} ${new Date(
            TODAY_START,
          ).toLocaleDateString('default', { month: 'short' })}`,
        );

        return {
          where: {
            status: 'completed',
            payment_status: 1,
            created_at: {
              [Op.gte]: new Date(TODAY_START),
              [Op.lte]: new Date(NOW),
            },
          },
        };
      };

      const dataArray = [];
      const dateArray: string[] = [];

      for (const i of [...new Array(dayToFetch + 1 || 31).keys()]) {
        const data = await Order.sum('amount', day(i));
        dataArray.unshift(data || 0);
      }

      response.data = {
        data: dataArray,
        dates: dateArray,
      };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async getUsersForSendSms(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const limit: any = parseInt(req.query.limit?.toString() || '50');
    const page: any = parseInt(req.query.page?.toString() || '1');

    try {
      const users = await User.findAll({
        where: {
          phone: {
            [Op.ne]: '0',
          },
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [['id', 'DESC']],
      });

      response.data = users;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async sendSmsToUser(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    try {
      const { message, user_limit, only_wallet_user } = req.body;

      let transactionArray: Array<number> = [];

      if (only_wallet_user) {
        transactionArray = [
          ...(await Transaction.findAll({
            where: {
              status: 'completed',
            },
            attributes: ['user_id'],
            group: ['user_id'],
            raw: true,
          })),
        ].map((transaction) => transaction.user_id);
      }

      let filter = {};

      if (only_wallet_user) {
        filter = { id: transactionArray };
      }

      const users = await User.findAll({
        where: filter,
        attributes: ['phone'],
        group: ['phone'],
        raw: true,
        limit: parseInt(user_limit) || undefined,
      });

      res.end();

      let userPhones = users.map((user) => user.phone);
      userPhones = userPhones.filter((phone) => phone);
      while (userPhones.length > 0) {
        const senderArr = userPhones.slice(0, 100);
        userPhones = userPhones.splice(100);
        try {
          const smsResponse = await axios.get(
            `https://api.sms.net.bd/sendsms?api_key=${
              process.env.SMS_HASH_TOKEN
            }&msg=${encodeURI(message)}&to=${senderArr.toString()}`,
          );
          console.log(smsResponse);
        } catch (error) {
          console.error(error);
        }
      }
    } catch (error) {
      console.error(error);
      res.status(400).send(response.internalError);
    }
  }
}

/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new AdminController();
