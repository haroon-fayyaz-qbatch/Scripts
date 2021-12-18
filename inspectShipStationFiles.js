require("dotenv/config")
const fs = require("fs")
const { omit } = require("lodash")
const { TrackingItem } = require("./models")
const { getModels } = require("./utils/sequelizeHelper")
const { SOURCE_ORDER_STATUSES } = require("./config/constants")

;(async () => {
  try {
    const files = fs.readdirSync(process.cwd() + "/POST")
    const arr = []
    for (const file of files) {
      const ShipNotice = require(`./POST/${file}`)
      const { OrderID, OrderNumber } = ShipNotice
      const trackingItem = await TrackingItem.findOne({
        attributes: ["account_id", "shipped_date", "wh_tracking_number"],
        where: { order_id: OrderNumber, source_order_id: +OrderID }
      })
      if (!trackingItem) continue
      const { SourceOrder, SupplierOrder } = getModels(trackingItem.account_id)
      const sourceOrder = await SourceOrder.findOne({ where: { id: OrderID } })
      const supplierOrder = await SupplierOrder.findOne({ where: { source_order_id: +OrderID } })
      if (
        !trackingItem.wh_tracking_number ||
        sourceOrder.status === SOURCE_ORDER_STATUSES.wh_delivered ||
        supplierOrder.warehouse_shipping === 0
      ) {
        arr.push({ ShipNotice: omit(ShipNotice, ["query", "params"]) })
      }
    }
    fs.writeFileSync("newErrorsFile.json", JSON.stringify(arr))
  } catch (error) {
    console.log("error: ", error)
  }
})()
