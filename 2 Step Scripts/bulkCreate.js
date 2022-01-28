const { map } = require("lodash")
const { TrackingItem } = require("./models")
;(async () => {
  try {
    const data = await TrackingItem.bulkCreate(
      [
        { id: 7314, tracking_status: "delivered", account_id: 2, marketplace: "walmart" },
        { id: 7315, tracking_status: "delivered", account_id: 2, marketplace: "walmart" }
      ],
      { updateOnDuplicate: ["tracking_status", "delivered_date"] }
    )
    const ids = map(data, "id")
    await TrackingItem.update({ delivered_date: new Date() }, { where: { id: ids }, individualHooks: true })
  } catch (e) {
    console.error(e)
  }
})()
