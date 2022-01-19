require("dotenv/config")
require("./utils/prototypes")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const {
  MARKETPLACE_STATUSES: { Delivered },
  SOURCE_ORDER_STATUSES,
  SUPPLIER_ORDER_STATUSES,
  ORDER_TRACKING_STATUSES
} = require("./config/constants")
const { map } = require("lodash")
const { makeToken } = require("./utils/currentUser")

const { delivered } = ORDER_TRACKING_STATUSES
const { processed } = SUPPLIER_ORDER_STATUSES
const responses = {}
;(async () => {
  const accountIds = await allSchemas("source_orders", { justIds: true })
  await accountIds.parallel(async accountId => {
    try {
      const { SourceOrder, SupplierOrder } = getModels(accountId)
      const sourceOrders = await SourceOrder.fetchAll({
        raw: true,
        attributes: ["id", "status", "marketplace_status", "fulfillment_channel"],
        include: {
          model: SupplierOrder,
          attributes: ["id", "status", "tracking_status"],
          where: { status: processed, tracking_status: delivered }
        },
        where: { status: null, marketplace_status: Delivered },
        order: [["updated_at", "DESC"]]
      })
      const completedOrderIds = map(sourceOrders, "id")
      console.log("completedOrders: ", completedOrderIds)
      const req = makeToken("SYSTEM", accountId)

      const [count] = await SourceOrder.update(
        { status: SOURCE_ORDER_STATUSES.completed },
        { where: { id: map(sourceOrders, "id") }, individualHooks: true, req }
      )
      responses[accountId] = count
    } catch (err) {
      console.log("tenant ", accountId, " err: ", err.message)
    }
  })
})()
