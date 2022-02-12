require("dotenv/config")
const moment = require("moment")
const {
  Account,
  Sequelize: { where, fn, col }
} = require("./models")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const responses = {}
;(async () => {
  try {
    const tableAccs = await allSchemas("marketplace_accounts", { justIds: true })

    const accounts = await Account.findAll({
      raw: true,
      attributes: ["id", "email"],
      where: { two_step_feature: true, id: tableAccs }
    })
    const dateCol = fn("date_format", col("source_orders.updated_at"), "%Y-%m-%d")
    await accounts.parallel(async acc => {
      const { SourceOrder, SourceItem } = getModels(acc.id)
      const sourceOrders = await SourceOrder.fetchAll({
        raw: true,
        attributes: ["id"],
        include: [{ model: SourceItem, required: true, where: { source_order_id: 9389, sku: "VAT59-785577367427" } }],
        where: [
          where(dateCol, ">=", moment().subtract(1, "days").format("YYYY-MM-DD HH:mm")),
          where(dateCol, "<=", moment().endOf("day").format("YYYY-MM-DD HH:mm")),
          { id: 9389 }
        ],
        order: [["updated_at", "DESC"]],
        subQuery: false
      })
      if (sourceOrders.length) responses[acc.id] = sourceOrders
    })

    console.log("done=================")
  } catch (err) {
    console.log("error: ", err)
  }
})()
