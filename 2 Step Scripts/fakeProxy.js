require("dotenv/config")
require("./utils/prototypes")
const moment = require("moment")
const {
  Account,
  Sequelize: { Op }
} = require("./models")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const responses = {}
;(async () => {
  const accIds = await allSchemas("supplier_orders", { justIds: true })
  await accIds.parallel(async accId => {
    const { SupplierOrder } = getModels(accId)
    const account = await Account.findByPk(accId, { attributes: ["email"], raw: true })
    const supplierOrder = await SupplierOrder.findOne({
      raw: true,
      attributes: ["source_order_id", "created_at", "target_order_id"],
      where: { proxy_tracking_number: { [Op.ne]: null } },
      order: [["created_at", "DESC"]]
    })
    if (supplierOrder && moment(supplierOrder.created_at, "DD/MM/YYYY").year() === 2022) {
      responses[accId] = {
        date: moment(supplierOrder.created_at).format("MMM, DD YYYY"),
        user: account.email,
        order: supplierOrder.source_order_id
      }
    }
  })
  console.log("Done ===============")
})()
