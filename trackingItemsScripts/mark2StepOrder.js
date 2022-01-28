const { getModels } = require("./utils/sequelizeHelper")
const { makeToken } = require("./utils/currentUser")
const { sequelize } = require("./models")
const {
  SOURCE_ORDER_STATUSES: { wh_delivered: WHDelivered }
} = require("./config/constants")

;(async () => {
  let transaction
  try {
    const orders = [1326768]
    const reqToken = makeToken("SYSTEM", 2)
    const { SourceOrder, SourceItem } = getModels(2)
    transaction = await sequelize.transaction()
    await SourceOrder.update(
      {
        fulfillment_channel: "WH",
        wh_address: {
          id: 1,
          city: "Mansfield",
          name: "iFulfill Warehouse",
          phone: "8665512595",
          state: "PA",
          country: "US",
          zipcode: "16933",
          address1: "719 Lambs Creek Rd",
          address2: ""
        },
        wh_id: 1,
        issue_reason: null,
        issue_note: null,
        status: WHDelivered
      },
      { where: { id: orders }, req: reqToken, transaction }
    )

    await SourceItem.update(
      { ship_to_warehouse: true },
      { where: { source_order_id: orders }, req: reqToken, transaction }
    )
    await transaction.commit()
    console.log("done")
  } catch (error) {
    transaction && (await transaction.rollback())
  }
})()
