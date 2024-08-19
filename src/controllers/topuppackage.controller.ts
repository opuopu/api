import Schema from '../models';
import express from 'express'
import responseUtils from '../utils/response.utils';

const {
    User,
    Order, AuthModule, Admin, AdminAuth, TopupPackage, TopupPackagePermission
} = Schema;
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class TopupPackageController {
    async getTopupPackages(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        try {
            const topupPackages = await TopupPackage.findAll();
            response.data = topupPackages
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
    async getTopupPackageById(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        const id = req.params.id

        try {
            const data = await TopupPackage.findByPk(id);
            response.data = data || [];
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
    async createTopupPackage(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        const {
            product_id,
            name,
            price,
            buy_price,
            admin_com,
            tag,
            in_stock,
            voucher_id,
            is_auto,
            sort_order
        } = req.body

        try {

            await TopupPackage.create({
                product_id,
                name,
                price,
                buy_price,
                admin_com,
                tag,
                is_auto,
                voucher_id,
                in_stock,
                sort_order
            })

            response.message = 'Created successfully'
            res.send(response.response)

        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
    
    async updateTopupPackage(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        const id = req.params.id
        const {
            product_id,
            name,
            price,
            buy_price,
            admin_com,
            tag,
            voucher_id,
            in_stock,
            is_auto,
            sort_order
        } = req.body

        try {
            const topupPackage = await TopupPackage.findByPk(id)
            if (!topupPackage) {
                response.message = 'Package not found to update'
                return res.status(400).send(response.internalError)
            }

            topupPackage.product_id = product_id;
            topupPackage.name = name;
            topupPackage.price = price;
            topupPackage.buy_price = buy_price;
            topupPackage.admin_com = admin_com;
            topupPackage.voucher_id = voucher_id;
            topupPackage.tag = tag;
            topupPackage.is_auto = is_auto;
            topupPackage.sort_order = sort_order;
            
            if (in_stock == 1 || in_stock == 0) {
                topupPackage.in_stock = in_stock;
            }
            await topupPackage.save()

            response.message = 'Updated successfully'
            res.send(response.response)

        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }

    async deleteTopupPackage(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        const id = req.params.id

        try {
            await TopupPackage.destroy({ where: { id } });
            response.message = 'Deleted successfully'
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }

    async getTopupPackagesByProductId(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = req.params.id

        try {
            const topupPackages = await TopupPackage.findAll({
                where: {
                    product_id: id,
                }
            });
            response.data = topupPackages
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }

    async getTopupPackagePermissionByAdminId(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = req.params.id

        try {
            const topupPackages = await TopupPackagePermission.findAll({
                where: {
                    admin_id: id,
                },
                raw: true,
                attributes: ['topup_package_id'],
            });

            const onlyArray = topupPackages.map(e => e.topup_package_id)

            response.data = onlyArray
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }

    async addPermission(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const body = req.body;

        try {

            await TopupPackagePermission.destroy({
                where: {
                    admin_id: body.admin_id
                }
            })

            for (const packageId of body.topup_package_id) {
                await TopupPackagePermission.create({
                    admin_id: body.admin_id,
                    topup_package_id: packageId,
                })
            }
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
    async updateDollarRate(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const { product_id, dollar_rate } = req.body;

        try {

            const packages = await TopupPackage.findAll({ where: { product_id } })

            if (!packages) {
                response.message = 'No packages found to update'
                return res.status(400).send(response.response)
            }

            packages.forEach(async (pakg) => {
                const updatedPrice = pakg.buy_price == '0' ? pakg.price : parseInt(pakg.buy_price) * parseFloat(dollar_rate)
                const toCeil = Math.ceil(Number(updatedPrice))
                pakg.price = toCeil.toString()
                await pakg.save()
            })

            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
}

/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new TopupPackageController();
