const { addWhAddress } = require("./utils/bull-helpers/orders-job-helpers")

;(async () => {
  const results = await addWhAddress(
    { data: { tenantId: 1499 } },
    ["954091882-AT", "185418887-AT", "B082-32378-R8G-32377", "315376272-AT", "8122021_1_761"],
    [9664, 9749, 9575, 9576, 9741]
  )
  console.log("results: ", results)
})()
