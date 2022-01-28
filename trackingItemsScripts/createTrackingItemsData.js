const csvWriter = require("csv-writer")

const { TrackingItem, Sequelize, Warehouse } = require("./models")
const { Op } = Sequelize
const moment = require("moment")
const { map, groupBy, last, omit, keys } = require("lodash")
const fs = require("fs")
const EPData = require("./cleanData.json")

;(async () => {
  const trackingItems = await TrackingItem.fetchAll({
    raw: true,
    include: { model: Warehouse, attribute: ["name"], required: true },
    attributes: ["wh_tracking_number", "wh_tracking_carrier", "order_id", "warehouse_id"],
    where: { wh_tracking_number: { [Op.ne]: null } }
  })
  const groupedTrackingItems = groupBy(trackingItems, "wh_tracking_number")
  const formattedData = EPData.map(data => {
    const itemData = groupedTrackingItems[data.tracking_code]
    if (!itemData) return
    const lastDetail = last(data.tracking_details)
    return {
      "Order id": itemData[0].order_id,
      "Tracking number": data.tracking_code,
      Carrier: data.carrier,
      "Label Created Date": moment(data.created_at).format("DD-MM-YYYY HH:mm"),
      "Delivered date":
        lastDetail.status === "delivered" ? moment(lastDetail.datetime).format("DD-MM-YYYY HH:mm") : null,
      Events: map(
        [lastDetail],
        detail =>
          `Status: ${detail.status}: Description: ${detail.description}, date: ${moment(detail.datetime).format(
            "DD-MM-YYYY HH:mm"
          )}`
      ).join("\n"),
      Warehouse: itemData[0].warehouse.name
    }
  })
  // const formattedData = require("./formattedData.json")
  const sheetData = []
  formattedData.forEach(row => {
    const rowData = omit(row, "Events")
    // console.log("split: ", row.Events.split("\n"))
    sheetData.push(map(row.Events.split("\n"), (event, i) => (i ? { Events: event } : { ...rowData, Events: event })))
  })
  const writeHead = csvWriter.createObjectCsvWriter({
    path: "Warehouse Items Detail 2.csv",
    header: keys(formattedData[0]).map(col => ({ id: col, title: col }))
  })

  await writeHead.writeRecords(sheetData.flat())
  console.log("done: ")
  fs.writeFileSync("formattedData.json", JSON.stringify(formattedData))
})()
