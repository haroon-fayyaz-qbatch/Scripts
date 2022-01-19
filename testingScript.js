const { getModels } = require("./utils/sequelizeHelper")

;(async () => {
  const { SourceOrder } = getModels(2)
  const sourceOrders = [
    { id: 2, marketplace_status: "Acknowledged" },
    { id: 3, marketplace_status: "Acknowledged" }
  ]
  await SourceOrder.bulkCreate(
    sourceOrders.map(x => x.except("prevStatus", "prevMarketplaceStatus")),
    { updateOnDuplicate: ["marketplace_status"], individualHooks: true }
  )
})()
