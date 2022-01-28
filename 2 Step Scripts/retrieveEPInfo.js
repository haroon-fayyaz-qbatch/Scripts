require("dotenv/config")
const { retrieveTracker } = require("./utils/easyPostApi")

;(async () => {
  const result = await retrieveTracker({ trackingCode: "9374889710008939110605", carrier: "USPS" })
  console.log("result: ", JSON.stringify(result, null, 2))
})()
