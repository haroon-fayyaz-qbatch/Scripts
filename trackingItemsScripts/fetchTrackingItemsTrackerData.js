require("dotenv/config")
require("./utils/prototypes")
const { TrackingItem, Sequelize } = require("./models")
const { Op } = Sequelize
const { retrieveTracker } = require("./utils/easyPostApi")
const fs = require("fs")

;(async () => {
  try {
    const trackingItems = await TrackingItem.findAll({
      raw: true,
      attributes: ["wh_tracking_number", "wh_tracking_carrier"],
      where: { wh_tracking_number: { [Op.ne]: null } }
    })
    const result = await trackingItems.parallel(
      item => retrieveTracker({ trackingCode: item.wh_tracking_number, carrier: item.wh_tracking_carrier }),
      5
    )
    fs.writeFileSync("allTrackersData.json", JSON.stringify(result.flat()))
    console.log("done=========")
  } catch (err) {
    console.log("error: ", err)
  }
})()
