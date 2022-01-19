require("dotenv/config")
require("./utils/prototypes")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const { Sequelize } = require("./models")
const { where, fn, col, Op } = Sequelize

;(async () => {
  const accountIds = await allSchemas("order_logs", { justIds: true })
  await accountIds.parallel(async account => {
    const { OrderLog } = getModels(account)
    await OrderLog.destroy({
      where: [
        {
          note: {
            [Op.or]: [
              where(fn("LOWER", col("note")), "LIKE", "%from undefined%"),
              where(fn("LOWER", col("note")), "LIKE", "%to undefined%"),
              where(fn("LOWER", col("note")), "LIKE", "%from null%"),
              where(fn("LOWER", col("note")), "LIKE", "%to null%")
            ]
          }
        },
        where(fn("date_format", col("created_at"), "%Y-%m-%d"), ">=", "2022-01-07")
      ]
    })
  })
})()
