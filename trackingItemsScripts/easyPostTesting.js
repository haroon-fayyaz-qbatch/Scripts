const { createEasyPostTracker } = require("./utils/easyPostApi")
const { makeToken } = require("./utils/currentUser")
const { getModels } = require("./utils/sequelizeHelper")

;(async () => {
  try {
    const req = makeToken("TESTING", 2)
    const { SupplierOrder } = getModels(req)
    const supplierOrder = await SupplierOrder.findOne({ raw: true, where: { source_order_id: 1327094 } })
    // console.log("supplierOrder: ", supplierOrder)
    await createEasyPostTracker(supplierOrder, req)
  } catch (error) {
    console.log("error: ", error)
  }
})()
