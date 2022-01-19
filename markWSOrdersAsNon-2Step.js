require("dotenv/config")
require("./utils/prototypes")
const { TrackingItem, Sequelize } = require("./models")
const { getModels } = require("./utils/sequelizeHelper")
const { makeToken } = require("./utils/currentUser")
const { parseOrderStatus } = require("./utils/parseSourceOrderStatus")
const { where, fn, col, Op } = Sequelize
const { map } = require("lodash")

{
  const { SupplierOrder, SourceOrder, SourceItem } = getModels(2)
  const orders = SourceOrder._findAll({
    raw: true,
    attributes: ["id"],
    include: {
      attributes: ["id", "supplier_name"],
      model: SourceItem,
      where: {
        ship_to_warehouse: 1,
        supplier_name: {
          [Op.or]: [
            where(fn("LOWER", col("supplier_name")), "LIKE", "%ifulfil%"),
            where(fn("LOWER", col("supplier_name")), "LIKE", "%topdawg%")
          ]
        }
      }
    }
  })
  // console.log("orders", JSON.stringify(orders, null, 2))
  const orderIds = map(orders, "id")
  const req = makeToken("SYSTEM", 2)
  req.body = {}
  SupplierOrder._update({ warehouse_id: null }, { where: { source_order_id: orderIds, status: "processed" } })
  SourceOrder._update(
    { fulfillment_channel: null, wh_address: null, wh_id: null },
    { where: { id: orderIds } }
  )

  SourceItem._update({ ship_to_warehouse: false }, { where: { source_order_id: orderIds } })
  TrackingItem._destroy({ where: { source_order_id: orderIds } })
  const _orders = SourceOrder._findAll({
    raw: true,
    where: { id: orderIds, status: { [Op.ne]: "completed" } },
    include: [SupplierOrder, SourceItem].map(model => ({ model }))
  })
  const updateBody = _orders.reduce((arr, x) => {
    const newStatus = parseOrderStatus(x)
    if (newStatus && newStatus !== x.status) arr.push({ id: x.id, status: newStatus })
    return arr
  }, [])
  SourceOrder._bulkCreate(updateBody, { updateOnDuplicate: ["status"] })

  console.log("order Ids: ", orderIds, " length: ", orderIds.length)
  console.log("done")
}
