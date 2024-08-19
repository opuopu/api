import moment from 'moment';
import { DataTypes, literal, Model, Sequelize } from 'sequelize';
import defaultFormat from '../config/dateFormatConfig';
import { Schema } from './Schemas';
const config = require('../config/CommonPatternConfig');

export default (sequelize: Sequelize) => {
  class Transaction extends Model {
    public id!: number;
    public user_id!: number;
    public amount!: number;
    public is_automated!: number;
    public paymentmethod_id!: number;
    public payment_method!: string;
    public status!: string;
    public purpose!: string;
    public number!: string;
    public transaction_id!: string;

    static associate({ PaymentMethod }: typeof Schema) {
      this.belongsTo(PaymentMethod, {
        foreignKey: 'paymentmethod_id',
        constraints: false,
      });
    }
  }

  Transaction.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_automated: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      paymentmethod_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '',
      },
      purpose: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '',
      },
      payment_method: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '',
      },
      number: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '',
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: literal('NOW()'),
        get() {
          return moment(this.getDataValue('created_at')).format(defaultFormat);
        },
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: literal('NOW()'),
        get() {
          return moment(this.getDataValue('updated_at')).format(defaultFormat);
        },
      },
    },
    {
      tableName: 'transactions',
      modelName: 'Transaction',
      sequelize,
      ...config.config,
    },
  );

  if (process.env.AUTO_MIGRATION === 'ON') {
    Transaction.sync({ alter: true }).then();
  }

  return Transaction;
};
