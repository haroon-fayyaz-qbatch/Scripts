require("dotenv/config")
const { TrackingItem, sequelize, EasypostTracker } = require("./models")
const { getModels } = require("./utils/sequelizeHelper")
const { makeToken } = require("./utils/currentUser")
const { trackingUrlsMethods } = require("./utils/carrierMapping")
const { getEasyPostCarrier, createTracker } = require("./utils/easyPostApi")
const { ORDER_TRACKING_STATUSES } = require("./config/constants")

const createEasyPostTracker = async (whCarrier, trackingNo, accountId) => {
  const carrier = getEasyPostCarrier(whCarrier)
  if (!carrier) return false
  const tracker = createTracker({ trackingCode: trackingNo, carrier })
  await tracker.save()
  await EasypostTracker.createOne(tracker.id, accountId, true)
  return true
}

;(async () => {
  let transaction
  const ShipNotices = require("./ErrorOrders.json")
  for (const ShipNotice of ShipNotices) {
    try {
      const {
        ShipNotice: { TrackingNumber, Carrier, OrderID, ShippingCost, OrderNumber }
      } = ShipNotice
      const trackingItem = await TrackingItem.findOne({
        attributes: ["account_id", "shipped_date"],
        where: { order_id: OrderNumber, source_order_id: +OrderID }
      })
      if (!trackingItem) continue
      transaction = await sequelize.transaction()
      const trackingData = {
        wh_tracking_number: TrackingNumber,
        wh_tracking_carrier: Carrier,
        wh_tracking_status: ORDER_TRACKING_STATUSES.shipped,
        shipped_date: new Date(),
        wh_tracking_url: (trackingUrlsMethods[Carrier] && trackingUrlsMethods[Carrier](TrackingNumber)) || ""
      }

      if (trackingItem && !trackingItem.easypost_created) {
        trackingData.easypost_created = await createEasyPostTracker(Carrier, TrackingNumber, trackingItem.account_id)
      }
      await TrackingItem.update(trackingData, {
        where: { source_order_id: OrderID, account_id: trackingItem.account_id, warehouse_id: 1 },
        individualHooks: true,
        transaction
      })
      const { SourceOrder, SupplierOrder } = getModels(trackingItem.account_id)
      const sourceOrder = await SourceOrder.findOne({ where: { id: OrderID } })
      const reqToken = makeToken("iFulfill Warehouse", trackingItem.account_id || 2)
      await SupplierOrder.update(
        { warehouse_shipping: ShippingCost },
        { where: { source_order_id: OrderID }, individualHooks: true, req: reqToken, transaction }
      )
      await SourceOrder.updateStatusOnWHFulfilled(sourceOrder, reqToken, transaction)
      await transaction.commit()
    } catch (error) {
      console.log("error: ", error)
      transaction && (await transaction.rollback())
    }
  }
})()
