const { SOURCE_ORDER_STATUSES } = require("./config/constants")
const { getModels } = require("./utils/sequelizeHelper")
const { map } = require("lodash")
const { Sequelize } = require("./models")
const { where, fn, col, Op } = Sequelize

{
  const orders = [
    "8863652823094",
    "8863652715877",
    "8863663981838",
    "8863664374201",
    "8863664386784",
    "8863665941210",
    "8870027528575",
    "8870027537485",
    "8870027555552",
    "8870026492924",
    "8870028246776",
    "8870037389532",
    "8870038808431",
    "8870039460497",
    "8870039523777",
    "8870039899010",
    "9870030598316",
    "9870042151097",
    "9870042387965",
    "9870053696149",
    "8870027537485",
    "8870038808431",
    "9870042387965"
  ]
  const { SourceOrder, OrderLog } = getModels(2)
  SourceOrder._update({ status: SOURCE_ORDER_STATUSES.shipped }, { where: { marketplace_order_id: orders } })

  const orderLogs = OrderLog._findAll({
    raw: true,
    attributes: ["id", "source_order_id", "note"],
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
  const logIds = map(orderLogs, "id")
  OrderLog._destroy({ where: { id: logIds } })
}
