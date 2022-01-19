require("dotenv/config")
const { getModels } = require("./utils/sequelizeHelper")
const { chunk } = require("lodash")

;(async () => {
  try {
    const { SourceOrder } = getModels(2)
    const sourceOrders = await SourceOrder.findAll({ raw: true, where: { fulfillment_channel: "WH" } })
    for (const orders of chunk(sourceOrders, 5000)) {
      const updatedOrders = orders.map(order => ({
        id: order.id,
        wh_id: order.wh_address.id
      }))
      await SourceOrder.bulkCreate(updatedOrders, { updateOnDuplicate: ["wh_id"] })
    }
  } catch (error) {
    console.log("error: ", error)
  }
})()
