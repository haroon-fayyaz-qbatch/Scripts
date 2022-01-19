require("dotenv/config")
require("./utils/prototypes")
const fs = require("fs")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const { parseOrderStatus } = require("./utils/parseSourceOrderStatus")
const { makeToken } = require("./utils/currentUser")
const responses = {}
const responsesCount = {}
const counts = {}
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

      // const req = makeToken("SYSTEM", accountId)
      const updateBody = sourceOrders.reduce((arr, x) => {
        const newStatus = parseOrderStatus(x)
        if (newStatus && newStatus !== x.status) arr.push({ id: x.id, status: newStatus })
        return arr
      }, [])
      if (updateBody.length) {
        responses[accountId] = updateBody
        responsesCount[accountId] = updateBody.length
      }
      if (sourceOrders.length) counts[accountId] = sourceOrders.length

      // await SourceOrder.bulkCreate(updateBody, { updateOnDuplicate: ["status"], req })
    } catch (err) {
      console.log("tenant ", accountId, " err: ", err)
    }
  }, 20)
  console.log("responses counts: ", responsesCount)
  fs.writeFileSync("new responses.json", JSON.stringify(responses))
  fs.writeFileSync("counts.json", JSON.stringify(counts))
  console.log("done ===============")
})()
