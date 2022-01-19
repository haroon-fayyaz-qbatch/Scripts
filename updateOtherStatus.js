require("dotenv/config")
require("./utils/prototypes")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const { parseOrderStatus } = require("./utils/parseSourceOrderStatus")
const { makeToken } = require("./utils/currentUser")
let done = false
const responses = {}
;(async () => {
  const accountIds = await allSchemas("source_orders", { justIds: true })
  await accountIds.parallel(async accountId => {
    try {
      const { SourceOrder, SupplierOrder, SourceItem } = getModels(accountId)
      const sourceOrders = await SourceOrder.fetchAll({
        raw: true,
        include: [SupplierOrder, SourceItem].map(model => ({ model })),
        where: { status: null }
      })
      sourceOrders.length && (responses[accountId] = { totalNull: sourceOrders.length })
      const req = makeToken("SYSTEM", accountId)
      const updateBody = sourceOrders.reduce((arr, x) => {
        const newStatus = parseOrderStatus(x)
        if (newStatus && newStatus !== x.status) arr.push({ id: x.id, status: newStatus })
        return arr
      }, [])
      updateBody.length && (responses[accountId].updated = updateBody.length)
      await SourceOrder.bulkCreate(updateBody, { updateOnDuplicate: ["status"], req })
    } catch (err) {
      console.log("tenant ", accountId, " err: ", err)
    }
  })
  done = true
})()
