const { tenantWise } = require("./utils/sequelizeHelper")
const { sequelize, Sequelize } = require("./models")
const { DataTypes } = Sequelize
const { queryInterface: qI } = sequelize

;(async () => {
  await tenantWise("source_items")(async table => {
    try {
      await qI.changeColumn(table, "supplier_name", DataTypes.STRING)
    } catch (e) {
      console.log("ERROR", e)
    }
  })
})()
