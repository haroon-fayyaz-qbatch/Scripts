require("./utils/prototypes")
const { TrackingItem, Account, Sequelize } = require("./models")
const { SOURCE_ORDER_STATUSES, ORDER_TRACKING_STATUSES } = require("./config/constants")
const { getModels } = require("./utils/sequelizeHelper")
const { map, values, pick } = require("lodash")
const responses = {}
;(async () => {
  const accountIds = map(
    await TrackingItem.findAll({
      raw: true,
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("account_id")), "account_id"]]
    }),
    "account_id"
  )
  await accountIds.parallel(async accId => {
    const account = await Account.findByPk(accId, { raw: true, attributes: ["email"] })
    const { SourceOrder } = getModels(accId)
    const sourceOrders = await SourceOrder.fetchAll({
      raw: true,
      limit: 5,
      logging: console.log,
      subQuery: false,
      attributes: ["id", "wh_id"],
      include: {
        model: TrackingItem,
        attributes: ["tracking_status"],
        where: {
          account_id: accId,
          wh_tracking_number: null,
          tracking_status: values(pick(ORDER_TRACKING_STATUSES, "checked_in", "shipped", "delivered", "in_transit"))
        }
      },
      where: { status: [SOURCE_ORDER_STATUSES.shipped, SOURCE_ORDER_STATUSES.completed] }
    })
    responses[accId] = { email: account.email, sourceOrders }
  })
  console.log("Done ==========")
})()
