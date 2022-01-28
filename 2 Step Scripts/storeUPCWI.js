require("dotenv/config")
require("./utils/prototypes")
const { TrackingItem, Sequelize, Account } = require("./models")
const { getModels } = require("./utils/sequelizeHelper")
const { getSuppliers, switchTenantDB } = require("./utils/matching")
const { groupBy, map, flatMap, merge } = require("lodash")

;(async () => {
  const trackingItems = await TrackingItem.findAll({
    raw: true,
    attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("account_id")), "account_id"]]
  })
  const accIds = trackingItems.map(item => item.account_id)
  const trackingItemsToUpdate = []
  await accIds.parallel(async tenantId => {
    const account = await Account.findByPk(tenantId, { attributes: ["email"] })
    const { SourceOrder, SourceItem } = getModels(tenantId)
    const sourceOrders = await SourceOrder.fetchAll({
      raw: true,
      subQuery: false,
      attributes: ["id", "marketplace_account_id", "marketplace_order_id", "store_name"],
      include: [
        {
          model: TrackingItem,
          attribute: ["id", "account_id", "source_id", "order_id", "sku"],
          where: { account_id: tenantId }
        },
        {
          model: SourceItem,
          attributes: ["id", "source_order_id", "marketplace_account_id", "marketplace_order_id", "sku"],
          required: true
        }
      ]
    })
    const sourceItemsToUpdate = []
    const groupedOrders = groupBy(sourceOrders, "marketplace_account_id")
    const connection = await switchTenantDB(account.email)
    await Object.entries(groupedOrders).parallel(async ([accId, orders]) => {
      const skus = flatMap(orders, order => map(order.tracking_items, "sku"))
      const suppliers = await getSuppliers({ connection }, { platform: orders[0].store_name, skus, partnerId: +accId })
      const groupedSup = groupBy(suppliers, "sku")
      sourceItemsToUpdate.push(
        flatMap(orders, order => order.source_items.map(item => merge(item, { upc: groupedSup[item.sku]?.[0].upc })))
      )
      trackingItemsToUpdate.push(
        flatMap(orders, order => order.tracking_items.map(item => merge(item, { upc: groupedSup[item.sku]?.[0].upc })))
      )
    })
    await SourceItem.bulkCreate(sourceItemsToUpdate.flat(), { updateOnDuplicate: ["upc"] })
  })
  await TrackingItem.bulkCreate(trackingItemsToUpdate.flat(), { updateOnDuplicate: ["upc"] })
})()
