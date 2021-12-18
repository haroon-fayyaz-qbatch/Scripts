const { merge, entries, omit, keys } = require("lodash")
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

const getValue = (value, data) =>
  data.type === "float" ? toF(value ?? 0) : data.len ? truncate(value, data.len) : value

const ordersData = sourceOrders.map(order => {
  const data = entries(omit(SHIPSTATION_KEYS, ["Customer", "Item"])).reduce((acc, [key, val]) => {
    if (val.values) merge(acc, { [key]: getValue(val?.values[0], val) })
    else if (["ShippingAmount", "TaxAmount"].includes(key)) {
      merge(acc, {
        [key]: getValue(
          order?.[val.table]?.reduce((acc, curr) => acc + curr[val.col], 0),
          val
        )
      })
    } else if (key === "OrderTotal") merge(acc, { [key]: getValue(order?.[val.table]?.reduce(pricePredicate, 0), val) })
    else if (["source_orders"].includes(val.table)) merge(acc, { [key]: getValue(order?.[val.col], val) })
    else merge(acc, { [key]: getValue(order?.[val.table]?.[0]?.[val.col], val) })
    return acc
  }, {})
  data.Customer = {
    CustomerCode: getValue(SHIPSTATION_KEYS.Customer.CustomerCode?.values[0], SHIPSTATION_KEYS.Customer.CustomerCode)
  }
  data.Customer = keys(omit(SHIPSTATION_KEYS.Customer, "CustomerCode")).reduce(
    (kAcc, cKey) =>
      merge(kAcc, {
        [cKey]: entries(SHIPSTATION_KEYS.Customer[cKey]).reduce(
          (acc, [key, val]) => merge(acc, { [key]: getValue(order?.[val.table]?.[val.col], val) }),
          {}
        )
      }),
    data.Customer
  )
  data.Items = {
    Item: order.source_items.map(item =>
      entries(SHIPSTATION_KEYS.Item).reduce(
        (acc, [k, v]) =>
          merge(acc, {
            [k]: getValue(
              k === "Name" ? item[v.col] + ", " + order?.tracking_items?.[0]?.tracking_number : item[v.col],
              v
            )
          }),
        {}
      )
    )
  }
  return data
})

console.log("ordersData: ", JSON.stringify(ordersData, null, 2))
