require("dotenv/config")
require("./utils/prototypes")
const { TrackingItem } = require("./models")
const { retrieveTracker } = require("./utils/easyPostApi")
const fs = require("fs")
const { map, pick, groupBy, last, merge } = require("lodash")

;(async () => {
  try {
    const trackingItems = await TrackingItem.findAll({
      raw: true,
      attributes: [
        "id",
        "account_id",
        "source_order_id",
        "order_id",
        "sku",
        "tracking_number",
        "tracking_carrier",
        "marketplace",
        "marketplace_status",
        "item_id"
      ],
      where: { delivered_date: null, tracking_status: "delivered" }
    })
    console.log("total: ", trackingItems.length)
    // const result = await trackingItems.parallel(
    //   item => retrieveTracker({ trackingCode: item.tracking_number, carrier: item.tracking_carrier }),
    //   20
    // )
    // fs.writeFileSync("allTrackersData.json", JSON.stringify(result.flat()))
    // const data = require("./allTrackersData.json")
    // const epData = map(data, x =>
    //   merge(pick(x, "carrier", "status", "tracking_code", "created_at", "updated_at"), {
    //     tracking_details: last(x.tracking_details)
    //   })
    // )
    // fs.writeFileSync("epData.json", JSON.stringify(epData))

    // // const epData = require("./epData.json")
    // // const groupedEPData = groupBy(epData, "tracking_code")
    // // const updatedItems = trackingItems
    // //   .map(data => {
    // //     const itemData = groupedEPData[data.tracking_number]
    // //     if (!itemData) return
    // //     return merge(data, { delivered_date: itemData[0].tracking_details.datetime })
    // //   })
    // //   .filter(x => x)

    // // // fs.writeFileSync("updatedItems.json", JSON.stringify(updatedItems))
    // // console.log("tracking items: ", trackingItems.length)
    // const updatedItems = require("./updatedItems.json")
    // console.log("updatedItems: ", updatedItems.length)
    // await TrackingItem.bulkCreate(updatedItems, { updateOnDuplicate: ["delivered_date"] })
    console.log("done=========")
  } catch (err) {
    console.log("error: ", err)
  }
})()
