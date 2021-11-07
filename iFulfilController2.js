const { getModels } = require("../utils/sequelizeHelper")
const { Sequelize } = require("../models")
const JSONToXML = require("js2xmlparser")
const { pricePredicate } = require("../utils/common")

const moment = require("moment")
const getCDataField = field => {
  return "<![CDATA[" + field + "]]>"
}
module.exports.getShipStationXML = async (req, res) => {
  try {
    const { SourceOrder, SourceOrderAddress, SourceItem, SupplierOrder } = getModels(2)
    const { action, start_date: startDate, end_date: endDate } = req.query
    console.log("start_date: " + startDate)
    if (action !== "export") return res.status(404).json({ message: "Not Found" })
    if (!startDate || !endDate || moment(startDate).isAfter(moment(endDate))) {
      return res
        .status(400)
        .json({ error: "invalid dates maximum allowed range is three moths", startDate, endDate, success: false })
    }

    const sourceOrders = await SourceOrder.fetchAll({
      raw: true,
      include: [
        {
          model: SourceItem,
          required: true
        },
        {
          model: SupplierOrder
        },
        {
          model: SourceOrderAddress,
          required: true
        }
      ],
      where: [
        Sequelize.where(
          Sequelize.fn("date_format", Sequelize.col("source_orders.updated_at"), "%m/%d/%Y %H:%i"),
          ">=",
          startDate
        ),
        Sequelize.where(
          Sequelize.fn("date_format", Sequelize.col("source_orders.updated_at"), "%m/%d/%Y %H:%i"),
          "<=",
          endDate
        )
      ],
      limit: 6
    })
    const ordersDetail = sourceOrders.map(order => {
      const data = {
        OrderID: getCDataField(order.id),
        OrderNumber: getCDataField(order.marketplace_order_id),
        OrderDate: moment.utc(order.order_date).format("MM/d/yyyy hh:mm"),
        OrderStatus: getCDataField(order.status),
        LastModified: moment.utc(order.updated_at).format("MM/d/yyyy hh:mm"),
        PaymentMethod: getCDataField("Credit Card"),
        CurrencyCode: "USD",
        OrderTotal: order?.source_items?.reduce(pricePredicate, 0).toFixed(2),
        TaxAmount: order?.source_items?.reduce((acc, curr) => acc + curr.tax, 0),
        ShippingAmount: order?.source_items?.reduce((acc, curr) => acc + curr.shipping, 0),
        Customer: {
          ShipTo: {
            Name: order?.source_order_address?.name ? getCDataField(order.source_order_address.name) : "",
            Address1: order?.source_order_address?.address1 ? getCDataField(order.source_order_address.address1) : "",
            Address2: order?.source_order_address?.address2 ? getCDataField(order.source_order_address.address2) : "",
            City: order?.source_order_address?.city ? getCDataField(order.source_order_address.city) : "",
            State: order?.source_order_address?.state ? getCDataField(order.source_order_address.state) : "",
            PostalCode: order?.source_order_address?.zipcode ? getCDataField(order.source_order_address.zipcode) : "",
            Country: order.source_order_address.country ? getCDataField(order.source_order_address.country) : "",
            Phone: order?.source_order_address?.phone ? getCDataField(order.source_order_address.phone) : ""
          }
        }
      }
      if (order.supplier_orders.tracking_carrier) { data.ShippingMethod = getCDataField(order.supplier_orders.tracking_carrier) }
      const item = order.source_items.map(item => ({
        SKU: getCDataField(item.sku),
        Name: getCDataField(item.name),
        Quantity: item.qty,
        Price: item.price
      }))
      data.Items = { Item: item }
      return data
    })
    const data = {
      Orders: {
        "@": {
          pages: "1"
        },
        Order: ordersDetail
      }
    }
    const xml = JSONToXML.parse("Orders", data)
    return res.status(200).send(xml)
  } catch (error) {
    return res.status(500).json({ error })
  }
}

module.exports.saveShipStationData = async (req, res) => {

}
