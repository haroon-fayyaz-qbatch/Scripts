require("dotenv/config")
require("./utils/prototypes")
const fs = require("fs")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const {
  MARKETPLACE_STATUSES: { Delivered, Created, Cancelled, Canceled, Shipped, Acknowledged, Unshipped },
  SOURCE_ORDER_STATUSES,
  SUPPLIER_ORDER_STATUSES,
  ORDER_TRACKING_STATUSES
} = require("./config/constants")
const { map, uniq, concat, intersection } = require("lodash")
const { makeToken } = require("./utils/currentUser")

const {
  cancelled: tCancelled,
  lost,
  refund,
  in_transit: inTransit,
  unshipped,
  shipped: tShipped,
  delivered
} = ORDER_TRACKING_STATUSES
const { processed, ignored, cancelled: spCancelled } = SUPPLIER_ORDER_STATUSES
;(async () => {
  const accountIds = await allSchemas("source_orders", { justIds: true })
  for (const accountId of accountIds) {
    try {
      const { SourceOrder, SupplierOrder } = getModels(accountId)
      const sourceOrders = await SourceOrder.fetchAll({
        raw: true,
        attributes: ["id", "status", "marketplace_status", "fulfillment_channel"],
        include: {
          model: SupplierOrder, attributes: ["id", "status", "tracking_status"]
          // , where: { status: processed, tracking_status: delivered }
        },
        where: { status: null },
        order: [["updated_at", "DESC"]]
      })
      console.log("no supplier orders: ", map(sourceOrders.filter(x => !x.supplier_orders || !x.supplier_orders?.length), "id"))
      console.log("tenant ", accountId, " total Orders: ", sourceOrders.length)
      const completedOrderIds = uniq(
        map(
          sourceOrders.filter(
            order =>
              order.marketplace_status === Delivered &&
              order?.supplier_orders?.some(
                sp => sp.status === processed && ![refund, lost, tCancelled, tShipped].includes(sp.tracking_status)
              )
          ),
          "id"
        )
      )
      console.log("completedOrders: ", completedOrderIds)
      const newOrderIds = uniq(
        map(
          sourceOrders.filter(order => order.marketplace_status === Created || order?.supplier_orders?.length === 0),
          "id"
        )
      )
      console.log("new Orders: ", newOrderIds)

      const cancelledOrderIds = uniq(
        map(
          sourceOrders.filter(
            order =>
              [Cancelled, Canceled].includes(order.marketplace_status) &&
              order?.supplier_orders?.length &&
              order?.supplier_orders?.every(sp => sp.status === spCancelled || sp.tracking_status === tCancelled)
          ),
          "id"
        )
      )

      const refundOrderIds = uniq(
        map(
          sourceOrders.filter(
            order =>
              [Cancelled, Canceled].includes(order.marketplace_status) &&
              order?.supplier_orders?.length &&
              order?.supplier_orders?.every(
                sp =>
                  (sp.status === ignored && sp.tracking_status === refund) ||
                  (sp.status === processed && sp.tracking_status === tCancelled)
              )
          ),
          "id"
        )
      )

      const processedOrderIds = uniq(
        map(
          sourceOrders.filter(
            order =>
              [Acknowledged, Unshipped].includes(order.marketplace_status) &&
              order.fulfillment_channel !== "WH" &&
              order?.supplier_orders?.some(sp => sp.status === processed && sp.tracking_status === unshipped)
          ),
          "id"
        )
      )

      const whShippedOrderIds = uniq(
        map(
          sourceOrders.filter(
            order =>
              [Acknowledged].includes(order.marketplace_status) &&
              order.fulfillment_channel === "WH" &&
              order?.supplier_orders?.some(
                sp => sp.status === processed && [tShipped, inTransit].includes(sp.tracking_status)
              )
          ),
          "id"
        )
      )

      const whDeliveredOrderIds = uniq(
        map(
          sourceOrders.filter(
            order =>
              [Acknowledged].includes(order.marketplace_status) &&
              order.fulfillment_channel === "WH" &&
              order?.supplier_orders?.some(sp => sp.status === processed && [delivered].includes(sp.tracking_status))
          ),
          "id"
        )
      )
      const results = {
        completedOrderIds,
        newOrderIds,
        cancelledOrderIds,
        refundOrderIds,
        processedOrderIds,
        whShippedOrderIds,
        whDeliveredOrderIds
      }
      const whCols = ["whShipped", "whDelivered"]
      const statues = ["completed", "new", "cancelled", "refund", "processed"]
      const total = concat(statues, whCols).reduce((acc, curr) => {
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

      // const req = makeToken("SYSTEM", accountId)

      // await statues.parallel(status =>
      //   SourceOrder.update(
      //     { status: SOURCE_ORDER_STATUSES[status] },
      //     { where: { id: results[status + "OrderIds"] }, individualHooks: true, req }
      //   )
      // )

      // await SourceOrder.update(
      //   { status: SOURCE_ORDER_STATUSES.wh_shipped },
      //   { where: { id: whShippedOrderIds }, individualHooks: true, req }
      // )
      // await SourceOrder.update(
      //   { status: SOURCE_ORDER_STATUSES.wh_delivered },
      //   { where: { id: whDeliveredOrderIds }, individualHooks: true, req }
      // )
    } catch (err) {
      console.log("tenant ", accountId, " err: ", err.message)
    }
  }
})()
