require("dotenv/config")
require("./utils/prototypes")
const { getModels } = require("./utils/sequelizeHelper")
const { groupBy } = require("lodash")
const { TrackingItem } = require("./models")
const amazonSupplierOrders = require("./amazon_orders.json")

;(async () => {
  try {
    const targetOrderIds = amazonSupplierOrders.map(orderId => orderId.order_number)
    const { SupplierOrder } = getModels(2)
    const supplierOrders = SupplierOrder._findAll({
      raw: true,
      attributes: ["source_order_id", "target_order_id"],
      where: { target_order_id: targetOrderIds }
    })
    const groupedData = groupBy(amazonSupplierOrders, "order_number")
    await supplierOrders.parallel(async order => {
      const data = groupedData[order.target_order_id]
      if (!data) return
      await SupplierOrder.update(
        { tracking_num: data[0].tracking_number, tracking_status: data[0].tracking_status },
        { where: { target_order_id: data[0].order_number } }
      )
      await TrackingItem.update(
        { tracking_number: data[0].tracking_number, tracking_status: data[0].tracking_status },
        { where: { source_order_id: order.source_order_id }, silent: true, paranoid: false }
      )
    })
  } catch (error) {
    console.log("error", error)
  }
  console.log("done")
})()
