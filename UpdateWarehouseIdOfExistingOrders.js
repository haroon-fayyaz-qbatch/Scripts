require("dotenv/config")
const {
  sequelize,
  Sequelize: { Op }
} = require("./models")
const { getModels } = require("./utils/sequelizeHelper")

;(async () => {
  let transaction
  try {
    transaction = await sequelize.transaction()

    const { SourceOrder } = getModels(2)
    const sourceOrders = await SourceOrder.findAll({
      raw: true,
      where: { fulfillment_channel: "WH", wh_id: { [Op.is]: null } }
    })
    const updatedOrders = sourceOrders.map(order => ({
      id: order.id,
      wh_id: order.wh_address.id
    }))
    await SourceOrder.bulkCreate(updatedOrders, { updateOnDuplicate: ["wh_id"], transaction })

    await transaction.commit()
  } catch (error) {
    console.log("error: ", error)
    transaction && (await transaction.rollback())
  }
})()
