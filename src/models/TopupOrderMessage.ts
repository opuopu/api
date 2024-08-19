const config = require('../config/CommonPatternConfig')
import moment from 'moment';
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import defaultFormat from '../config/dateFormatConfig';

export default (sequelize: Sequelize) => {
    class TopupOrderMessage extends Model {
        public id!: number;
        public message!: string;
    }

    TopupOrderMessage.init({
        message: {
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
            defaultValue: literal("NOW()"),
            get() {
                return moment(this.getDataValue('updated_at')).format(defaultFormat);
            }
        }
    }, {
        tableName: 'topup_order_messages',
        modelName: 'TopupOrderMessage',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        TopupOrderMessage.sync({ alter: true }).then()
    }

    return TopupOrderMessage
}