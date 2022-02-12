require("dotenv/config")
require("./utils/prototypes")
const { TrackingItem } = require("./models")

;(async () => {
  try {
    const updatedItems = require("./updatedItems.json")
    console.log("updatedItems: ", updatedItems.length)
    await TrackingItem.bulkCreate(updatedItems, { updateOnDuplicate: ["delivered_date"] })
    console.log("done=========")
  } catch (err) {
    console.log("error: ", err)
  }
})()
