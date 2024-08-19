const config = require('../config/CommonPatternConfig');
import { DataTypes, literal, Model, Sequelize } from 'sequelize';
import { Schema } from './Schemas';

export default (sequelize: Sequelize) => {
  class Voucher extends Model {
    public id!: number;
    public package_id!: number;
    public data!: string;
    public order_id?: number;
    public is_used!: number;
    public soft_deleted!: number;
    public created_at!: Date;

    static associate({ TopupPackage, Order }: typeof Schema) {
      this.belongsTo(TopupPackage, {
        foreignKey: 'package_id',
        constraints: false,
      });

      this.belongsTo(Order, {
        foreignKey: 'order_id',
        constraints: false,
      });
    }
  }

  Voucher.init(
    {
      package_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      data: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_used: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      soft_deleted: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: literal('NOW()'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: literal('NOW()'),
      },
    },
    {
      tableName: 'vouchers',
      modelName: 'Voucher',
      sequelize,
      ...config.config,
    },
  );

  if (process.env.AUTO_MIGRATION === 'ON') {
    Voucher.sync({ alter: true }).then();
  }

  return Voucher;
};
