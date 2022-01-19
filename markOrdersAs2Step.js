const { getModels } = require("./utils/sequelizeHelper")
const { makeToken } = require("./utils/currentUser")
const { sequelize } = require("./models")

;(async () => {
  let transaction
  try {
    const orders = [1326714, 1326709]
    const reqToken = makeToken("SYSTEM", 2)
    const { SourceOrder, SourceItem, SupplierOrder } = getModels(2)
    transaction = await sequelize.transaction()
    await SourceOrder.update(
      {
        fulfillment_channel: "WH",
        wh_address: {
          id: 1,
          city: "Mansfield",
          name: "iFulfill Warehouse",
          phone: "8889050495",
          state: "PA",
          country: "US",
          zipcode: "16933",
          address1: "719 Lambs Creek Rd",
          address2: ""
        },
        wh_id: 1
      },
      { where: { id: orders }, req: reqToken, transaction }
    )

    await SourceItem.update(
      { ship_to_warehouse: true },
      { where: { source_order_id: orders }, req: reqToken, transaction }
    )
    await SupplierOrder.update({ warehouse_id: 1 }, { where: { source_order_id: orders }, transaction, req: reqToken, individualHooks: true })
    await transaction.commit()
    console.log("done")
  } catch (error) {
    transaction && (await transaction.rollback())
  }
})()
