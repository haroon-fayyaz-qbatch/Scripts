const { Account, Warehouse } = require("./models")

;(async () => {
  const warehouses = await Account.fetchByPk(2, {
    attributes: [],
    raw: true,
    include: {
      model: Warehouse,
      attributes: ["city", "state", "zipcode"],
      as: "AccountWarehouse",
      through: { attributes: [] },
      required: true
    }
  })
  console.log("warehouses: ", JSON.stringify(warehouses, null, 2))
})()
