require("dotenv/config")
const { TrackingItem, sequelize } = require("./models")
const { merge } = require("lodash")
const { getModels } = require("./utils/sequelizeHelper")
const { makeToken } = require("./utils/currentUser")
const { ORDER_TRACKING_STATUSES } = require("./config/constants")

;(async () => {
  let transaction
  const ShipNotices = require("./ErrorOrders.json")
  for (const ShipNotice of ShipNotices) {
    try {
      const { TrackingNumber, Carrier, OrderID, ShippingCost, OrderNumber } = ShipNotice
      let skusArr = []
    if (Array.isArray(Items?.Item)) skusArr = Items?.Item?.map(item => item.SKU)
    else skusArr = [Items?.Item?.SKU]
    const trackingItem = await TrackingItem.findOne({
      attributes: ["id", "account_id", "shipped_date", "wh_tracking_number", "is_paid"],
      where: { order_id: OrderNumber, source_order_id: OrderID }
    })
    if (!trackingItem) {
      postRequestNotifier(new Error("Item not found"), { req })
      return res.status(404).json({ message: "Item not found" })
    }
    const { SourceOrder, SourceItem, SupplierOrder } = getModels(trackingItem.account_id)
    const sourceOrder = await SourceOrder.findOne({
      include: [{ model: SourceItem, where: { sku: skusArr } }],
      where: { id: OrderID }
    })
    if (!sourceOrder) {
      postRequestNotifier(new Error("Order Not Found"), { req })
      return res.status(404).json({ message: "Order not found" })
    }
    transaction = await sequelize.transaction()
    const canUpdate = !trackingItem.wh_tracking_number
    if (canUpdate) {
      let carrier = Carrier?.toLowerCase()?.split(" ")?.join("_")
      carrier = carrier ? carrierMapping[carrier] : carrier
      const trackingData = {
        wh_tracking_number: TrackingNumber,
        wh_tracking_carrier: carrier || Carrier,
        wh_tracking_status: ORDER_TRACKING_STATUSES.shipped,
        shipped_date: new Date(),
        wh_tracking_url: getTrackingUrl(Carrier, TrackingNumber)
      }
      if (!getTrackingUrl(Carrier, TrackingNumber)) {
        postRequestNotifier(new Error("Tracking URL doesn't exist"), { req, results: { TrackingNumber, Carrier } })
      }
      if (trackingItem && !trackingItem.easypost_created) {
        trackingData.easypost_created = await createEasyPostTracker(Carrier, TrackingNumber, trackingItem.account_id)
      }
      await TrackingItem.update(
        merge(trackingData, sourceOrder.store_name === MARKET_PLACES.walmart && { is_shipped: true }),
        {
          where: {
            source_order_id: OrderID,
            order_id: OrderNumber,
            account_id: trackingItem.account_id,
            warehouse_id: +req.params.id,
            sku: skusArr
          },
          individualHooks: true,
          transaction
        }
      )
    }
    const warehouse = await Warehouse.findByPk(+req.params.id, { attributes: ["id"] })
    const reqToken = makeToken(`Warehouse # ${warehouse?.id || ""}`, trackingItem.account_id || 2)
    await SupplierOrder.update(
      { warehouse_shipping: literal(`warehouse_shipping + ${ShippingCost}`) },
      { where: { source_order_id: OrderID }, individualHooks: true, req: reqToken, transaction }
    )
    await SourceOrder.updateStatusOnWHFulfilled(sourceOrder, reqToken, transaction, Service, ShippingCost, trackingItem)
    await transaction.commit()
    } catch (error) {
      transaction && (await transaction.rollback())
    }
  }
})()
