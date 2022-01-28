require("dotenv/config")
const {
  sequelize,
  Sequelize: { literal },
  TrackingItem,
  EasypostTracker,
  Warehouse
} = require("./models")
const { merge, map, groupBy } = require("lodash")
const { getModels } = require("./utils/sequelizeHelper")
const { makeToken } = require("./utils/currentUser")
const path = require("path")
const fs = require("fs")
const {
  ORDER_TRACKING_STATUSES,
  MARKET_PLACES,
  SUPPLIER_ORDER_STATUSES,
  MARKETPLACE_STATUSES
} = require("./config/constants")
const { Cancelled, Canceled } = MARKETPLACE_STATUSES
const { getTrackingUrl, carrierMapping } = require("./utils/carrierMapping")
const { getEasyPostCarrier, createTracker } = require("./utils/easyPostApi")

const createEasyPostTracker = async (whCarrier, trackingNo, accountId) => {
  const carrier = getEasyPostCarrier(whCarrier)
  if (!carrier) return false
  const tracker = createTracker({ trackingCode: trackingNo, carrier })
  await tracker.save()
  await EasypostTracker.createOne(tracker.id, accountId, true)
  return true
}

// const getMismatchSupplierOrders = async ShipNotices => {
//   const orderIds = map(ShipNotices, "OrderID")
//   const { SupplierOrder } = getModels(2)
//   const supplierOrders = await SupplierOrder.findAll({
//     raw: true,
//     attributes: ["source_order_id", "warehouse_shipping"],
//     where: { source_order_id: orderIds, status: SUPPLIER_ORDER_STATUSES.processed }
//   })
//   const groupedData = groupBy(supplierOrders, "source_order_id")

//   const filteredData = ShipNotices.filter(
//     data =>
//       groupedData[data.OrderID] &&
//       +data.ShippingCost !== groupedData[data.OrderID].reduce((acc, x) => acc + x.warehouse_shipping, 0)
//   )
//   await filteredData.parallel(shipNotice =>
//     SupplierOrder.update(
//       { warehouse_shipping: shipNotice.ShippingCost },
//       { where: { source_order_id: shipNotice.OrderID } }
//     )
//   )
//   console.log("filteredData length: ", filteredData.length)
//   await SupplierOrder.update({ warehouse_shipping: 0 }, { where: { status: SUPPLIER_ORDER_STATUSES.ignored } })
// }

;(async () => {
  const dirName = "POST"
  const ShipNotices = fs
    .readdirSync(path.resolve(__dirname, dirName))
    .filter(file => file[0] !== "." && file.slice(-5) === ".json")
    .map(file => require(path.join(__dirname, dirName, file)))
  const orderIds = map(ShipNotices, "data.OrderNumber")
  const trackingItems = await TrackingItem.findAll({
    raw: true,
    attributes: ["order_id", "wh_tracking_status", "wh_tracking_number", "marketplace_status"],
    where: { order_id: orderIds }
  })
  const groupedData = groupBy(trackingItems, "order_id")
  const filteredData = ShipNotices.filter(
    shipNotice =>
      groupedData[shipNotice.data.OrderNumber] &&
      groupedData[shipNotice.data.OrderNumber].some(
        x => ![Cancelled, Canceled].includes(x.marketplace_status) && (!x.wh_tracking_number || !x.wh_tracking_status)
      )
  )
  console.log("total: ", ShipNotices.length, " filtered: ", filteredData.length)

  // await filteredData.parallel(async ShipNotice => {
  //   let transaction
  //   try {
  //     const { TrackingNumber, Carrier, OrderID, ShippingCost, OrderNumber, Items, Service, query } = ShipNotice
  //     const whId = query["SS-Password"] === "UM9C1Opm" ? 9 : "tK0VkLtA"
  //     let skusArr = []
  //     if (Array.isArray(Items?.Item)) skusArr = Items?.Item?.map(item => item.SKU)
  //     else skusArr = [Items?.Item?.SKU]
  //     const trackingItem = await TrackingItem.findOne({
  //       attributes: ["id", "account_id", "shipped_date", "wh_tracking_number", "is_paid"],
  //       where: { order_id: OrderNumber, source_order_id: OrderID }
  //     })
  //     if (!trackingItem) {
  //       console.log("Item not found")
  //       return
  //     }
  //     const { SourceOrder, SourceItem, SupplierOrder } = getModels(trackingItem.account_id)
  //     const sourceOrder = await SourceOrder.findOne({
  //       include: [{ model: SourceItem, where: { sku: skusArr } }],
  //       where: { id: OrderID }
  //     })
  //     if (!sourceOrder) {
  //       console.log("Order not found")
  //       return
  //     }
  //     transaction = await sequelize.transaction()
  //     const canUpdate = !trackingItem.wh_tracking_number
  //     if (canUpdate) {
  //       let carrier = Carrier?.toLowerCase()?.split(" ")?.join("_")
  //       carrier = carrier ? carrierMapping[carrier] : carrier
  //       const trackingData = {
  //         wh_tracking_number: TrackingNumber,
  //         wh_tracking_carrier: carrier || Carrier,
  //         wh_tracking_status: ORDER_TRACKING_STATUSES.shipped,
  //         shipped_date: new Date(),
  //         wh_tracking_url: getTrackingUrl(Carrier, TrackingNumber)
  //       }
  //       if (trackingItem && !trackingItem.easypost_created) {
  //         trackingData.easypost_created = await createEasyPostTracker(Carrier, TrackingNumber, trackingItem.account_id)
  //       }
  //       await TrackingItem.update(
  //         merge(trackingData, sourceOrder.store_name === MARKET_PLACES.walmart && { is_shipped: true }),
  //         {
  //           where: {
  //             source_order_id: OrderID,
  //             order_id: OrderNumber,
  //             account_id: trackingItem.account_id,
  //             warehouse_id: whId,
  //             sku: skusArr
  //           },
  //           individualHooks: true,
  //           transaction
  //         }
  //       )
  //     }
  //     const warehouse = await Warehouse.findByPk(whId, { attributes: ["id", "creator_id"] })
  //     const reqToken = makeToken(`Warehouse # ${warehouse?.id || ""}`, trackingItem.account_id || 2)
  //     await SupplierOrder.update(
  //       { warehouse_shipping: literal(`warehouse_shipping + ${ShippingCost}`) },
  //       { where: { source_order_id: OrderID }, individualHooks: true, req: reqToken, transaction }
  //     )
  //     const shouldCharge = warehouse?.creator_id !== trackingItem.account_id
  //     await SourceOrder.updateStatusOnWHFulfilled(
  //       sourceOrder,
  //       reqToken,
  //       transaction,
  //       Service,
  //       ShippingCost,
  //       trackingItem,
  //       shouldCharge
  //     )
  //     await transaction.commit()
  //   } catch (error) {
  //     transaction && (await transaction.rollback())
  //   }
  // })
  // await getMismatchSupplierOrders(ShipNotices)
  console.log("done ====")
})()
