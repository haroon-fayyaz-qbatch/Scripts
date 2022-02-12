require("dotenv/config")
require("./utils/prototypes")
const moment = require("moment")
const fs = require("fs")
const {
  Account,
  Sequelize: { where, fn, col, Op }
} = require("./models")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const { concat, flatten } = require("lodash")

const responses = {}
;(async () => {
  const accIds = await allSchemas("source_orders", { justIds: true })
  const accounts = await Account.fetchAll({
    raw: true,
    where: { id: accIds },
    attributes: ["id"]
  })
  await accounts.parallel(async acc => {
    const { SupplierOrder, SourceOrder, SourceItem, OrderLog } = getModels(acc.id)
    const orders = await SourceOrder.fetchAll({
      attributes: ["id", "created_at"],
      raw: true,
      include: [
        { model: SourceItem, attributes: [], required: true },
        {
          model: SupplierOrder,
          attributes: ["id", "created_at", "supplier"],
          required: true,
          where: [
            where(fn("date_format", col("supplier_orders.created_at"), "%Y-%m-%d %H:%i"), ">=", "2022-02-10 14:45")
          ]
        },
        {
          model: OrderLog,
          required: true,
          where: {
            note: { [Op.like]: "Supplier Order Created Target Order Id%" },
            created_by: { [Op.like]: "%EMAIL_PARSER%" }
          }
        }
      ],
      order: [["created_at", "ASC"]]
    })
    if (orders.length) {
      const supplierOrders = flatten(
        orders.reduce((acc, order) => {
          const filteredOrders = order.supplier_orders.filter(
            sup => moment(sup.created_at).diff(moment(order.created_at), "months") >= 2
          )
          if (!filteredOrders.length) return
          return concat(acc, {
            order_id: order.id,
            created_at: order.created_at,
            supplier_orders: filteredOrders
          })
        }, [])
      )
      responses[acc.id] = { orders: supplierOrders, totalOrders: supplierOrders.length }
    }
  }, 25)
  // console.log("orders: ", JSON.stringify(responses))
  fs.writeFileSync("emailParserOrders.json", JSON.stringify(responses))
  console.log("DONE=============")
})()
