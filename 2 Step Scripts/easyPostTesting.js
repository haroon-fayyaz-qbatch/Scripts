require("dotenv/config")
const { createEasyPostTracker } = require("./utils/easyPostApi")
const { makeToken } = require("./utils/currentUser")
const { getModels } = require("./utils/sequelizeHelper")

;(async () => {
  try {
    const req = makeToken("TESTING", 307)
    const { SupplierOrder } = getModels(req)
    const supplierOrder = await SupplierOrder.findOne({ raw: true, where: { source_order_id: 12260 } })
    // console.log("supplierOrder: ", supplierOrder)
    await createEasyPostTracker(supplierOrder, req)
  } catch (error) {
    console.log("error: ", error)
  }
})()
