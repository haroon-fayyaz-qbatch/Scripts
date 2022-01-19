const { Account } = require("./models")
const { getModels } = require("./utils/sequelizeHelper")
const { merge, random, groupBy } = require("lodash")
const { getTrackingUrl } = require("./utils/carrierMapping")
const { createEasyPostTracker, getCarrier } = require("./utils/shipstationHelpers")
const { getSkusSuppliers } = require("./utils/matching")
const { makeToken } = require("./utils/currentUser")

const { SOURCE_ORDER_STATUSES, ORDER_TRACKING_STATUSES, SUPPLIER_ORDER_STATUSES } = require("./config/constants")
  ; (async () => {
  try {
    const {
      ShipNotice: { TrackingNumber, ShipDate, Carrier, OrderID, Items, ShippingCost }
    } = require("./ordersRes.json")
    const account = await Account.findOne({ where: { id: 2 } })
    const { SourceOrder, SourceItem, SupplierOrder } = getModels(2)
    const itemsData = Array.isArray(Items?.Item) ? Items?.Item : [Items?.Item]
    const skus = itemsData?.map(item => item.SKU)
    const supplierItems = Object.entries(groupBy(itemsData, "SKU")).map(([sku, value]) => ({
      sku,
      qty: value.reduce((acc, curr) => acc + +curr.Quantity, 0)
    }))
    const sourceOrder = await SourceOrder.fetchByPk(OrderID, {
      raw: true,
      include: { model: SourceItem, where: { sku: skus } }
    })
    if (!sourceOrder) console.log("Order not found")
    const suppliers = await getSkusSuppliers({
      partnerId: sourceOrder.marketplace_account_id,
      platform: sourceOrder.store_name,
      email: account.email,
      skus: skus,
      wholesaler: true
    })
    const { results: Suppliers } = suppliers
    console.log("suppliers: ", Suppliers)
    const targetOrderId = sourceOrder.marketplace_order_id + " _" + random(10000, 99999)
    let orderTotal = 0
    const shipping = +ShippingCost / (itemsData.length || 1)
    const carrier = getCarrier(Carrier)
    // const isEasypostCreated = true
    const isEasypostCreated = await createEasyPostTracker(Carrier, TrackingNumber, account.id)
    const supplierOrders = supplierItems.reduce((acc, item) => {
      for (const sku in Suppliers) {
        if (item.sku !== sku) continue
        const supplier = Suppliers[sku]?.find(x => x.is_default === 1)
        if (supplier) {
          orderTotal += supplier.price * item.qty * supplier.quantity_multiplier + shipping + supplier.tax
          acc.push({
            source_order_id: sourceOrder.id,
            target_order_id: targetOrderId,
            shipping_cost: shipping,
            tracking_status: ORDER_TRACKING_STATUSES.shipped,
            tracking_num: TrackingNumber,
            shipped_date: ShipDate,
            sku: item.sku,
            tracking_carrier: carrier,
            tracking_url: getTrackingUrl(carrier, TrackingNumber),
            easypost_created: isEasypostCreated,
            status: SUPPLIER_ORDER_STATUSES.processed,
            qty: item.qty,
            cost: supplier.price,
            qty_multiplier: supplier.quantity_multiplier,
            tax: +supplier.tax,
            is_shipped: false
          })
        }
      }
      return acc
    }, [])

    const data = supplierOrders.map(supplier => merge(supplier, { order_total: orderTotal }))
    const reqToken = makeToken("ShipStation WholeSale", account.id)
    await SupplierOrder.bulkCreate(data, { req: reqToken, individualHooks: true })
    await SourceOrder.update(
      { status: SOURCE_ORDER_STATUSES.shipped },
      { where: { id: OrderID }, req: reqToken, individualHooks: true }
    )
    console.log("DONE=========")
  } catch (error) {
    console.log("ERROR=========", error)
  }
})()
