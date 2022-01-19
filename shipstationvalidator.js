const { merge, entries, omit, keys, pick } = require("lodash")
const { pricePredicate, toF } = require("./utils/common")
const sourceOrders = require("./Orders.json")
const truncate = (str, charsLen = 99) => (str ? str.slice(0, charsLen) : "")

const SHIPSTATION_KEYS = {
  OrderID: { table: "source_orders", col: "id", type: "integer" },
  OrderNumber: { table: "source_orders", col: "marketplace_order_id", len: 50 },
  OrderDate: { table: "tracking_items", col: "created_at", type: "date" },
  OrderStatus: { table: "source_orders", col: "status", len: 50 },
  LastModified: { table: "source_orders", col: "updated_at", type: "date" },
  PaymentMethod: { values: ["Credit Card"], len: 50 },
  CurrencyCode: { values: ["USD"], len: 3 },
  OrderTotal: { table: "source_items", type: "float" },
  TaxAmount: { table: "source_items", col: "tax", type: "float" },
  ShippingAmount: { table: "source_items", col: "shipping", type: "float" },
  InternalNotes: { table: "tracking_items", col: "tracking_number", len: 1000 },
  Customer: {
    CustomerCode: { values: ["support@ecomcircles.com"], len: 50 },
    BillTo: { Name: { table: "source_order_address", col: "name", len: 100 } },
    ShipTo: {
      Name: { table: "source_order_address", col: "name", len: 100 },
      Address1: { table: "source_order_address", col: "address1", len: 200 },
      Address2: { table: "source_order_address", col: "address2", len: 200 },
      City: { table: "source_order_address", col: "city", len: 100 },
      State: { table: "source_order_address", col: "state", len: 100 },
      PostalCode: { table: "source_order_address", col: "zipcode", len: 50 },
      Country: { table: "source_order_address", col: "country", len: 2 },
      Phone: { table: "source_order_address", col: "phone", len: 50 }
    }
  },
  Item: {
    SKU: { table: "source_items", col: "sku", len: 100 },
    Quantity: { table: "source_items", col: "qty" },
    UnitPrice: { table: "source_items", col: "price", type: "float" },
    Name: { table: "source_items", col: "name", len: 200 },
    Weight: { table: "source_items", col: "weight", type: "float" },
    WeightUnits: { table: "source_items", col: "weight_unit", values: ["Grams", "Ounces", "Pounds"] }
  }
}

const SSOrders = require("./SSOrders.json")
;(() => {
  for (const order of SSOrders) {
    for (const [k, v] of Object.entries(omit(order, ["Customer", "Items"]))) {
      if (!order[k]) return `The key: ${k} doesn't exist in this order: ${order?.OrderNumber || ""}`
      const isValidType = typeof order[k] === (v.type || "string")
      if (!isValidType) return `The key: ${k} has an invalid type in order: ${order?.OrderNumber || ""}`
      if (v.len && v.len !== order[k].length) return `The key: ${k} has an invalid type in order: ${order?.OrderNumber || ""}`
    }
    if (!order.Customer || !order.Items) return `The key: ${k} doesn't exist in this order: ${order?.OrderNumber || ""}`
    for (const [k, v] of Object.entries(pick(order, "Customer"))) {
      if (!order[k]) return `The key: ${k} doesn't exist in this order: ${order?.OrderNumber || ""}`
      const isValidType = typeof order[k] === (v.type || "string")
      if (!isValidType) return `The key: ${k} has an invalid type in order: ${order?.OrderNumber || ""}`
      if (v.len && v.len !== order[k].length) return `The key: ${k} has an invalid type in order: ${order?.OrderNumber || ""}`
    }
  }
})()
