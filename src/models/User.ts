
const bcrypt = require('bcryptjs');
const config = require('../config/CommonPatternConfig')
import moment from 'moment';
import { DataTypes, literal, Model, Sequelize } from 'sequelize';
import defaultFormat from '../config/dateFormatConfig';



export default (sequelize: Sequelize) => {
  class User extends Model {
    public id!: number;
    public first_name!: string;
    public last_name!: string;
    public username!: string;
    public email!: string;
    public gender!: number;
    public wallet!: number;
    public date_of_birth!: number;
    public is_phone_verify!: number;
    public image!: number;
    public password!: string;
    public city!: string;
    public address!: string;
    public zip_code!: string;
    public phone!: string;
    public avatar!: string;

  }

  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    account_status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    is_phone_verify: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    wallet: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    zip_code: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: literal("NOW()"),
      get() {
        return moment(this.getDataValue('created_at')).format(defaultFormat);
      }
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: literal("NOW()")
    }
  }, {
    tableName: 'users',
    modelName: 'User',
    sequelize,
    ...config.config
  });


  User.beforeCreate(async (user: User, options: any) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 8);
    }
  });

  User.beforeUpdate(async (user: User, options: any) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 8);
    }
  });

  if (process.env.AUTO_MIGRATION === 'ON') {
    User.sync({ alter: true }).then()
  }

  return User
}