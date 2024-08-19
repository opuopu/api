import Schema from '../models';
import express from 'express';
import responseUtils from '../utils/response.utils';
import { Op, fn, col } from 'sequelize';

const { TopupProduct, Voucher, TopupPackage, Order } = Schema;

class TopupProductController {
  async getProducts(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const reqPath = req.protocol + '://' + req.get('host');

    const data = await TopupProduct.findAll({
      attributes: {
        include: [
          'logo',
          [
            fn('CONCAT', reqPath + '/images/', col('TopupProduct.logo')),
            'logo_full_url',
          ],
        ],
      },
    });
    response.data = data;
    res.send(response.response);
  }

  async getProductById(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const reqPath = req.protocol + '://' + req.get('host');

    const id = req.params.id;
    const data = await TopupProduct.findOne({
      where: {
        id,
      },
      attributes: {
        include: [
          'logo',
          [
            fn('CONCAT', reqPath + '/images/', col('TopupProduct.logo')),
            'logo_full_url',
          ],
        ],
      },
    });

    if (!data) {
      response.status = 400;
      response.success = false;
      response.message = 'TopupProduct not found';
      return res.status(400).send(response.response);
    }

    response.data = data;
    res.send(response.response);
  }

  async createProduct(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const { name, logo, rules, topup_type, is_active, sort_order, redeem_link, video_link } = req.body;

    const data = await TopupProduct.create({
      name,
      logo,
      rules,
      topup_type,
      is_active,
      sort_order,
      redeem_link,
      video_link
    });
    response.data = data;
    res.send(response.response);
  }

  async updateProduct(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const id = req.params.id;
    const { name, logo, rules, topup_type, is_active, sort_order, redeem_link, video_link } = req.body;

    const product = await TopupProduct.findByPk(id);

    if (!product) {
      response.status = 400;
      response.success = false;
      response.message = 'TopupProduct not found';
      return res.status(400).send(response.response);
    }

    product.name = name;
    product.logo = logo;
    product.rules = rules;
    product.topup_type = topup_type;
    product.is_active = is_active;
    product.sort_order = sort_order;
    product.redeem_link = redeem_link;
    product.video_link = video_link;

    await product.save();

    response.data = product;
    res.send(response.response);
  }

  async deleteProduct(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const id = req.params.id;

    await TopupProduct.destroy({
      where: {
        id,
      },
    });

    response.message = 'Deleted successfully';
    res.send(response.response);
  }

  softDeleteUsedVoucher = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    try {
      await Voucher.update(
        {
          soft_deleted: 1,
        },
        {
          where: {
            is_used: 1,
          },
        },
      );
      res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  };

  vouchersByPackage = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const packages = await TopupPackage.findByPk(req.params.package_id);

      const product = await TopupProduct.findByPk(packages?.product_id);

      const vouchers = await Voucher.findAll({
        where: {
          package_id: req.params.package_id,
          soft_deleted: 0,
        },
        order: [['is_used', 'ASC']],
      });

      response.data = {
        vouchers,
        package: packages,
        product,
      };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  };

  addVoucher = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      const { package_id, data } = req.body;
      const packages = await TopupPackage.findByPk(package_id);
      const product = await TopupProduct.findByPk(packages?.product_id);
      if (!product || product.topup_type !== 'voucher') {
        response.success = false;
        return res.status(400).send(response.response);
      }

      if (Array.isArray(data)) {
        for (const voucher of data) {
          await Voucher.create({ package_id, data: voucher });
        }
      }

      return res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  };

  editVoucher = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      const { data } = req.body;
      const id = req.params.id;
      const voucher = await Voucher.findByPk(id);
      if (!voucher) {
        response.success = false;
        return res.status(400).send(response.response);
      }

      voucher.data = data;
      await voucher.save();

      return res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  };

  deleteVoucher = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      await Voucher.destroy({
        where: {
          id: req.params.id,
        },
      });
      res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  };

  availableVoucherByPackage = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();

    try {
      const products = await TopupProduct.findAll({
        where: {
          topup_type: 'voucher',
        },
      });

      const productIds = products.map((product) => product.id);

      const packages = await TopupPackage.findAll({
        where: {
          product_id: productIds,
        },
      });

      const responseArray: any[] = [];

      for (const pack of packages) {
        const packObj: any = pack.toJSON();
        const availableVoucher = await Voucher.count({
          where: {
            package_id: pack.id,
            is_used: 0,
          },
        });

        const currentDate = new Date();

        const yesterDay = new Date();
        yesterDay.setDate(currentDate.getDate() - 1);

        const YESTERDAY_START = yesterDay.setHours(0, 0, 0, 0);
        const YESTERDAY_END = yesterDay.setHours(23, 59, 0, 0);

        const TODAY_START = currentDate.setHours(0, 0, 0, 0);
        const NOW = currentDate.setHours(23, 59, 0, 0);

        const todaySellVoucher = await Order.count({
          where: {
            topuppackage_id: pack.id,
            status: 'completed',
            created_at: {
              [Op.gte]: TODAY_START,
              [Op.lte]: NOW,
            },
          },
        });

        const yesterDaySellVoucher = await Order.count({
          where: {
            topuppackage_id: pack.id,
            status: 'completed',
            created_at: {
              [Op.gte]: YESTERDAY_START,
              [Op.lte]: YESTERDAY_END,
            },
          },
        });

        packObj['voucher_count'] = availableVoucher;
        packObj['today_sell'] = todaySellVoucher;
        packObj['yesterday_sell'] = yesterDaySellVoucher;

        responseArray.push(packObj);
      }

      response.data = responseArray;

      res.send(response.response);
    } catch (error) {
      console.error(error);
      return res.status(400).send(response.internalError);
    }
  };
}

export default new TopupProductController();
