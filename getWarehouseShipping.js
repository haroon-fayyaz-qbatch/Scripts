require("dotenv/config")
require("./utils/prototypes")
const { getModels } = require("./utils/sequelizeHelper")
const {
  Sequelize: { Op }
} = require("./models")
const { SUPPLIER_ORDER_STATUSES, SOURCE_ORDER_STATUSES } = require("./config/constants")
const fs = require("fs")

const updateSourceOrders = async SourceOrder => {
  const orders = require("./warehouseShipping.json")
  const sourceOrders = await orders.parallel(order => ({
    id: order.id,
    warehouse_shipping: order.supplier_orders?.[0].warehouse_shipping || 0
  }))
  console.log("sourceOrders: ", sourceOrders)
  await SourceOrder.bulkCreate(sourceOrders, { updateOnDuplicate: ["warehouse_shipping"] })
}

;(async () => {
  try {
    const { SupplierOrder, SourceOrder } = getModels(2)
    const sourceOrders = await SourceOrder.fetchAll({
      raw: true,
      attributes: ["id"],
      where: {
        status: [SOURCE_ORDER_STATUSES.shipped, SOURCE_ORDER_STATUSES.completed],
        wh_address: { [Op.ne]: null }
      },
      include: {
        attributes: ["warehouse_shipping"],
        model: SupplierOrder,
        where: { status: SUPPLIER_ORDER_STATUSES.processed }
      }
    })
    fs.writeFileSync("warehouseShipping.json", JSON.stringify(sourceOrders))
    await updateSourceOrders(SourceOrder)
    console.log("done================")
  } catch (error) {
    console.log(error)
  }
})()
