const fs = require("fs")
const convert = require("xml-js")
const { pick } = require("lodash")

const filePath = process.cwd() + "/reports/shipStation/OrdersXML.xml"
module.exports.getShipStationXML = async (req, res) => {
  try {
    if (!fs.existsSync(filePath)) return res.status(404).send("File Not Found")
    const xmlData = fs.readFileSync(filePath, "utf-8")
    return res.status(200).send(xmlData)
  } catch (error) {
    return res.status(500).json({ error })
  }
}

module.exports.saveShipStationData = async (req, res) => {
  try {
    const { action, order_number: orderNumber } = req.query
    if (action !== "shipnotify") return res.status(404).json({ message: "Not Found" })
    const bodyData = req.body
    if (!bodyData || bodyData === {}) return res.status(404).json({ message: "No Data supplied for post request" })

    if (!fs.existsSync(filePath)) return res.status(404).send("File Not Found")
    const xml = fs.readFileSync(filePath, "utf-8")
    const result = convert.xml2js(xml, { compact: true, spaces: 4, ignoreDeclaration: true })
    const orderIndex = result.Orders.Order.findIndex(order => order.OrderNumber._cdata === orderNumber)
    if (orderIndex === -1) return res.status(404).json({ message: "This order is not found" })
    const obj = pick(
      bodyData.ShipNotice,
      "LabelCreateDate",
      "ShippingCost",
      "TrackingNumber",
      "Service",
      "Carrier",
      "ShipDate",
      "ShipNotice",
      "Recipient"
    )
    for (const [header, data] of Object.entries(obj)) {
      if (header === "Recipient") {
        result.Orders.Order[orderIndex][header] = {}
        for (const [key, value] of Object.entries(data)) {
          result.Orders.Order[orderIndex][header][key] = { _text: value }
        }
      } else {
        result.Orders.Order[orderIndex][header] = { _text: data }
      }
    }
    const xmlResponse = convert.json2xml(result, { compact: true, ignoreComment: true, spaces: 4 })
    if (!fs.existsSync(process.cwd() + "/reports/shipStation")) fs.mkdirSync(process.cwd() + "/reports/shipStation")
    fs.writeFileSync(filePath, xmlResponse)
    return res.status(200).send()
  } catch (error) {
    return res.status(500).json({ error })
  }
}

