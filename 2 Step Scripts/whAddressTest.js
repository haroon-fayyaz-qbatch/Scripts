require("dotenv/config")
const { addWhAddress } = require("./utils/bull-helpers/orders-job-helpers")

;(async () => {
  const results = await addWhAddress(
    { data: { tenantId: 307 } },
    ["WHL-2step-630509947867"],
    [12260]
  )
  console.log("results: ", results)
})()
