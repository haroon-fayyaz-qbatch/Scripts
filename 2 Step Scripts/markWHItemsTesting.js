const { getModels } = require("./utils/sequelizeHelper")
const { markItemsForWh, markItems } = require("./utils/bull-helpers/orders-job-helpers")

;(async () => {
  const tenantId = 2963
  const { MarketplaceAccount } = getModels(tenantId)
  const store = await MarketplaceAccount.findByPk(1, { raw: true })
  const job = {
    data: { tenantEmail: "celeboraoffice@gmail.com", tenantId }
  }
  // await markItemsForWh(job, ["SP-3073-26316603-298-389919"], [1327124], 16)
  // await markItemsForWh(job, ["ED-RDUZ-FNDL"], [7], store)
  await markItems(job, ["ED-RDUZ-FNDL"], [7], store, "amazon")
})()
