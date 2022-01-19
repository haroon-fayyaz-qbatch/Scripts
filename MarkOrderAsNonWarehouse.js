require("dotenv/config")
require("./utils/prototypes")
const { Op } = require("sequelize")
const { TrackingItem } = require("./models")
const { getModels } = require("./utils/sequelizeHelper")
const { makeToken } = require("./utils/currentUser")
const { parseOrderStatus } = require("./utils/parseSourceOrderStatus")

{
  const { SupplierOrder, SourceOrder, SourceItem } = getModels(2)
  const shippedToCustomer = [
    1320927, 1320609, 1322623, 1322263, 1322273, 1322934, 1322627, 1322637, 1323074, 1323068, 1323463, 1325595, 1323651,
    1325043, 1325766, 1326056, 1324671, 1326351, 1324705, 1324718, 1323376, 1322761, 1322491, 1322715, 1322653, 1322369,
    1321944, 1319962, 1320166, 1321208, 1321745, 1319323, 1320132, 1321777, 1320685, 1324815, 1324609, 1321135
  ]

  const req = makeToken("SYSTEM", 2)
  req.body = {}
  SupplierOrder._update({ warehouse_id: null }, { where: { source_order_id: shippedToCustomer, status: "processed" } })
  SourceOrder._update(
    { fulfillment_channel: null, wh_address: null, wh_id: null },
    { where: { id: shippedToCustomer } }
  )

  SourceItem._update({ ship_to_warehouse: false }, { where: { source_order_id: shippedToCustomer } })
  TrackingItem._destroy({ where: { source_order_id: shippedToCustomer } })
  const _orders = SourceOrder._findAll({
    raw: true,
    where: { id: shippedToCustomer, status: { [Op.ne]: "completed" } },
    include: [SupplierOrder, SourceItem].map(model => ({ model }))
  })
  const updateBody = _orders.reduce((arr, x) => {
    const newStatus = parseOrderStatus(x)
    if (newStatus && newStatus !== x.status) arr.push({ id: x.id, status: newStatus })
    return arr
  }, [])
  SourceOrder._bulkCreate(updateBody, { updateOnDuplicate: ["status"] })

  console.log("shipped To Customer: ", shippedToCustomer, " length: ", shippedToCustomer.length)
  console.log("done")
}
