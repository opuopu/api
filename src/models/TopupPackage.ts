
const bcrypt = require('bcryptjs');
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'



export default (sequelize: Sequelize) => {
    class TopupPackage extends Model {
        public id!: number;
        public product_id!: number;
        public name!: string;
        public type!: string;
        public price!: string;
        public buy_price!: string;
        public admin_com!: string;
        public tag!: string;
        public in_stock!: number;
        public is_auto!: number;
        public sort_order!: number;
        public voucher_id!: number;
    }

    TopupPackage.init({
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        price: {
            type: DataTypes.STRING,
            allowNull: true
        },
        buy_price: {
            type: DataTypes.STRING,
            allowNull: true
        },
        admin_com: {
            type: DataTypes.STRING,
            allowNull: true
        },
        tag: {
            type: DataTypes.STRING,
            allowNull: true
        },
        in_stock: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        is_auto: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        voucher_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        sort_order: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal("NOW()")
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal("NOW()")
        }
    }, {
        tableName: 'topuppackages',
        modelName: 'TopupPackage',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        TopupPackage.sync({ alter: true }).then()
    }

    return TopupPackage
}