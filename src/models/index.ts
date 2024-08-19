import { Schema } from './Schemas'


Schema.Order.associate(Schema)
Schema.Transaction.associate(Schema)
Schema.Admin.associate(Schema)
Schema.ProductOrder.associate(Schema)


export default Schema