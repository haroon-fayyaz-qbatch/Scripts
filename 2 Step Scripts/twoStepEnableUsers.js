require("dotenv/config")
const csvWriter = require("csv-writer")

const { Account } = require("./models")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
let stats
;(async () => {
  try {
    const tableAccs = await allSchemas("marketplace_accounts", { justIds: true })

    const accounts = await Account.findAll({
      raw: true,
      attributes: ["id", "email"],
      where: { two_step_feature: true, id: tableAccs }
    })
    stats = (
      await accounts.parallel(async acc => {
        const { MarketplaceAccount } = getModels(acc.id)
        const count = await MarketplaceAccount.count({ where: { two_step_enabled: true, marketplace: "amazon" } })
        if (!count) return
        return {
          email: acc.email,
          status: `Enabled at account level and ${count > 0 ? "Enabled" : "Disabled"} at store level`
        }
      })
    ).filter(x => x)
    const writeHead = csvWriter.createObjectCsvWriter({
      path: "users with amazon stores.csv",
      header: Object.keys(stats[0]).map(col => ({ id: col, title: col }))
    })
    await writeHead.writeRecords(stats)
    console.log("done=================")
  } catch (err) {
    console.log("error: ", err)
  }
})()
