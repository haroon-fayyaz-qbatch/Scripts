require("dotenv/config")
const { createEasyPostTracker } = require("./utils/easyPostApi")
const { makeToken } = require("./utils/currentUser")
const { getModels } = require("./utils/sequelizeHelper")
const { Warehouse } = require("./models")

;(async () => {
  try {
    const warehouse = await Warehouse.findByPk(10, {
      raw: true,
      attributes: ["id", "name", "address1", "address2", "city", "state", "zipcode", "phone", "country"]
    })
    console.log("warehouse", JSON.stringify(warehouse))

    const req = makeToken("TESTING", 307)
    const { SupplierOrder, SourceOrder } = getModels(req)
    // await SourceOrder.update({ fulfillment_channel: "WH", wh_address: warehouse }, { where: { id: 12278 } })
    // await SourceOrder.update({ fulfillment_channel: null, wh_address: null }, { where: { id: 1327097 } })
    const supplierOrder = await SupplierOrder.findOne({ raw: true, where: { source_order_id: 12276 } })
    // console.log("supplierOrder: ", supplierOrder)
    await createEasyPostTracker(supplierOrder, req)
  } catch (error) {
    console.log("error: ", error)
  }
})()
