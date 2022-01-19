require("dotenv/config")
require("./utils/prototypes")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const {
  MARKETPLACE_STATUSES: { Created, Acknowledged, Unshipped },
  SOURCE_ORDER_STATUSES
} = require("./config/constants")
const { map, uniq } = require("lodash")
const { makeToken } = require("./utils/currentUser")
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
          attributes: ["id", "status", "tracking_status"]
        },
        where: { status: null, marketplace_status: [Created, Acknowledged, Unshipped] }
      })
      const newOrderIds = uniq(
        map(
          sourceOrders.filter(order => order?.supplier_orders?.length === 0),
          "id"
        )
      )
      const req = makeToken("SYSTEM", accountId)

      const [count] = await SourceOrder.update(
        { status: SOURCE_ORDER_STATUSES.new },
        { where: { id: newOrderIds }, individualHooks: true, req }
      )
      responses[accountId] = count
    } catch (err) {
      console.log("tenant ", accountId, " err: ", err.message)
    }
  })
})()
