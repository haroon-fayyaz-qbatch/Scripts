require("dotenv/config")
require("./utils/prototypes")
const { SUPPLIER_ORDER_STATUSES } = require("./config/constants")
const { getModels } = require("./utils/sequelizeHelper")
const { pick, groupBy, filter, uniqBy, map, uniq } = require("lodash")
const { TrackingItem, TrackingItemNotice } = require("./models")
let data
;(async () => {
  const trackingItems = TrackingItem._findAll({ raw: true, paranoid: false })
  const items = groupBy(trackingItems, item =>
    ["account_id", "item_id", "source_order_id", "order_id"].map(k => item[k]).join(" => ")
  )
  const dup = filter(items, v => v.length > 1)
  data = dup
    .flat()
    .map(x => pick(x, ["id", "account_id", "item_id", "source_order_id", "tracking_number", "created_at"]))
  console.log("data: ", data.length)
  const accIds = uniqBy(data, "account_id").map(x => x.account_id)
  const deleteIds = []
  await accIds.parallel(async accId => {
    const accItems = data.filter(x => x.account_id === accId)
    const { SupplierOrder } = getModels(accId)
    const supplierOrders = await SupplierOrder.findAll({
      raw: true,
      attributes: ["id", "source_order_id", "tracking_num"],
      where: {
        source_order_id: uniq(map(accItems, "source_order_id")),
        status: SUPPLIER_ORDER_STATUSES.processed
      }
    })
    // console.log("supplierOrders: ", supplierOrders)
    const groupedOrders = groupBy(supplierOrders, "source_order_id")
    for (const item of accItems) {
      if (!groupedOrders[item.source_order_id]) continue
      // console.log(groupedOrders[item.source_order_id].some(order => order.tracking_num === item.tracking_number))
      if (
        groupedOrders[item.source_order_id].every(order => order.tracking_num !== item.tracking_number)
      ) {
        deleteIds.push(item.id)
      }
    }
  })
  // await TrackingItemNotice.destroy({ where: { tracking_item_id: deleteIds } })
  // console.log("total Deleted: ", await TrackingItem.destroy({ where: { id: deleteIds }, force: true }))
  console.log("deletedIds: ", deleteIds)
})()
