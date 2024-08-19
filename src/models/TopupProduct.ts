const config = require('../config/CommonPatternConfig');
import { Sequelize, DataTypes, Model, literal } from 'sequelize';

export default (sequelize: Sequelize) => {
  class TopupProduct extends Model {
    public id!: number;
    public name!: string;
    public logo!: string;
    public helper_image!: string;
    public rules!: string;
    public topup_type!: string;
    public is_active!: number;
    public sort_order!: number;
    public redeem_link!: string;
    public video_link!: string;
  }

  TopupProduct.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      helper_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      rules: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      topup_type: {
        type: DataTypes.ENUM('id_code', 'in_game', 'voucher'),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      redeem_link: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      video_link: {
        type: DataTypes.STRING,
        allowNull: true,
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
      tableName: 'topup_products',
      modelName: 'TopupProduct',
      sequelize,
      ...config.config,
    },
  );

  if (process.env.AUTO_MIGRATION === 'ON') {
    TopupProduct.sync({ alter: true }).then();
  }

  return TopupProduct;
};
