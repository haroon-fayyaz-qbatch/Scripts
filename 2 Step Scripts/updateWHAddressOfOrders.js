require("dotenv/config")
const { getModels } = require("./utils/sequelizeHelper")
const { sequelize, TrackingItem, Warehouse } = require("./models")
const { map } = require("lodash")
let responses = {}
;(async () => {
  let transaction
  try {
    const tenantId = 307
    const { SourceOrder } = getModels(tenantId)
    const sourceOrders = await SourceOrder.findAll({ attributes: ["id"], where: { fulfillment_channel: "WH" } })
    const warehouse = Warehouse.findByPk(1, {
      attributes: ["id", "name", "address1", "address2", "city", "state", "zipcode", "phone", "country"]
    })
    const orderIds = map(sourceOrders, "id")
    transaction = await sequelize.transaction()
    let [count] = await SourceOrder.update(
      {
        fulfillment_channel: "WH",
        wh_address: warehouse,
        wh_id: 1,
        issue_reason: null,
        issue_note: null
      },
      { where: { id: orderIds }, transaction }
    )
    responses.orders = count
    ;[count] = await TrackingItem.update({ warehouse_id: 1 }, { where: { source_order_id: orderIds }, transaction })
    responses.items = count
    await transaction.commit()
    console.log("done")
  } catch (error) {
    console.log("error: ", error)
    transaction && (await transaction.rollback())
  }
})()
