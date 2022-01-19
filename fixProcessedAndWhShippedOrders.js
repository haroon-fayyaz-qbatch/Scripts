require("dotenv/config")
require("./utils/prototypes")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const {
  MARKETPLACE_STATUSES: { Acknowledged, Unshipped, Shipped },
  SOURCE_ORDER_STATUSES,
  SUPPLIER_ORDER_STATUSES,
  ORDER_TRACKING_STATUSES
} = require("./config/constants")
const { map, uniq, concat, intersection } = require("lodash")
const { makeToken } = require("./utils/currentUser")

const { in_transit: inTransit, unshipped, shipped: tShipped, delivered } = ORDER_TRACKING_STATUSES
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
          where: { status: processed, tracking_status: [delivered, tShipped, unshipped, inTransit] }
        },
        where: { status: null },
        order: [["updated_at", "DESC"]]
      })

      const processedOrderIds = uniq(
        map(
          sourceOrders.filter(
            order =>
              [Acknowledged, Unshipped].includes(order.marketplace_status) &&
              order?.supplier_orders?.every(sp => sp.status === processed && sp.tracking_status === unshipped)
          ),
          "id"
        )
      )

      const shippedOrderIds = uniq(
        map(
          sourceOrders.filter(
            order =>
              [Shipped].includes(order.marketplace_status) &&
              order.fulfillment_channel !== "WH" &&
              order?.supplier_orders?.every(
                sp => sp.status === processed && [inTransit, tShipped].includes(sp.tracking_status)
              )
          ),
          "id"
        )
      )

      const wh_shippedOrderIds = uniq(
        map(
          sourceOrders.filter(
            order =>
              [Acknowledged].includes(order.marketplace_status) &&
              order.fulfillment_channel === "WH" &&
              order?.supplier_orders?.every(
                sp => sp.status === processed && [tShipped, inTransit].includes(sp.tracking_status)
              )
          ),
          "id"
        )
      )

      const results = {
        processedOrderIds,
        wh_shippedOrderIds,
        shippedOrderIds
      }
      const statues = ["wh_shipped", "shipped", "processed"]
      const total = concat(statues).reduce((acc, curr) => {
        const len = results[curr + "OrderIds"]?.length
        console.log(`${curr} order length: `, len)
        return acc + (len ?? 0)
      }, 0)

      console.log("total orders to update: ", total)

      Object.entries(results).forEach(([k, v]) => {
        Object.entries(results).forEach(([nk, nv]) => {
          if (k === nk) return
          console.log(`Intersection of ${k} and ${nk} is: `, intersection(v, nv))
        })
      })

      const req = makeToken("SYSTEM", accountId)

      // await statues.parallel(async status => {
      //   const [count] = SourceOrder.update(
      //     { status: SOURCE_ORDER_STATUSES[status] },
      //     { where: { id: results[status + "OrderIds"] }, individualHooks: true, req }
      //   )
      //   responses[accountId + " " + status] = count
      // })
    } catch (err) {
      console.log("tenant ", accountId, " err: ", err.message)
    }
  })
})()
