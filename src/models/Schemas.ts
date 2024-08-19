import { Sequelize } from 'sequelize';
import Admin from './Admin';
import AdminAuth from './AdminAuth';
import AuthModule from './AuthModule';
import Banner from './Banner';
import Inventorie from './Inventorie';
import Notice from './Notice';
import Order from './Order';
import Otp from './Otp';
import PasswordReset from './PasswordReset';
import PaymentMethod from './PaymentMethod';
import Product from './Product';
import ProductOrder from './ProductOrder';
import TopupOrderMessage from './TopupOrderMessage';
import TopupPackage from './TopupPackage';
import TopupPackagePermission from './TopupPackagePermission';
import TopupPaymentMethod from './TopupPaymentMethod';
import TopupProduct from './TopupProduct';
import Transaction from './Transaction';
import User from './User';
import Voucher from './Voucher';

export const sequelize = new Sequelize(
  process.env.DB_NAME || '',
  process.env.DB_USER || '',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 1000,
    },
    logging: process.env.DB_LOG === 'ON' ? true : false,
  },
);

export const Schema = {
  Otp: Otp(sequelize),
  User: User(sequelize),
  Order: Order(sequelize),
  Admin: Admin(sequelize),
  Notice: Notice(sequelize),
  Banner: Banner(sequelize),
  TopupProduct: TopupProduct(sequelize),
  AdminAuth: AdminAuth(sequelize),
  AuthModule: AuthModule(sequelize),
  Transaction: Transaction(sequelize),
  TopupPackage: TopupPackage(sequelize),
  PasswordReset: PasswordReset(sequelize),
  PaymentMethod: PaymentMethod(sequelize),
  TopupPaymentMethod: TopupPaymentMethod(sequelize),
  TopupPackagePermission: TopupPackagePermission(sequelize),
  Inventorie: Inventorie(sequelize),
  ProductOrder: ProductOrder(sequelize),
  Product: Product(sequelize),
  TopupOrderMessage: TopupOrderMessage(sequelize),
  Voucher: Voucher(sequelize),
};
