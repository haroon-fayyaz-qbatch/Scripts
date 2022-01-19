require("dotenv/config")
require("./utils/prototypes")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const { Sequelize } = require("./models")
const { where, fn, col } = Sequelize
const fs = require("fs")
const { groupBy, values, orderBy, chunk } = require("lodash")

const responses = {}
let done = false

;(async () => {
  const accountIds = await allSchemas("order_logs", { justIds: true })
  await accountIds.parallel(async accountId => {
    try {
      const { OrderLog } = getModels(accountId)
      const orderLogs = await OrderLog.findAll({
        raw: true,
        attributes: ["id", "source_order_id", "note", "created_at"],
        where: [where(fn("date_format", col("created_at"), "%Y-%m-%d"), ">=", "2022-01-07")],
        order: [
          ["source_order_id", "ASC"],
          ["created_at", "ASC"]
        ]
      })
      // fs.writeFileSync(`FILES/orderLogs ${accountId}.json`, JSON.stringify(orderLogs))
      const groupedLogs = groupBy(orderLogs, "source_order_id")

      const logIds = values(groupedLogs).reduce((arr, logs) => {
        orderBy(logs, "created_at", "asc").forEach((log, index) => {
          const next = index && logs[index - 1]
          if (next && log.note === next.note && log.source_order_id === next.source_order_id) arr.push(log.id)
        })
        return arr
      }, [])

      // const count = 0;
      if (!logIds.length) return

      for (const idsChunk of chunk(logIds, 10000)) {
        const count = await OrderLog.destroy({ where: { id: idsChunk } })
        if (!responses[accountId]) responses[accountId] = []
        responses[accountId].push({ total: idsChunk.length, count })
      }
    } catch (err) {
      console.log("tenant ", accountId, " err: ", err)
    }
  }, 20)
  done = true
  // fs.writeFileSync("responses 2.json", JSON.stringify(responses))
})()
