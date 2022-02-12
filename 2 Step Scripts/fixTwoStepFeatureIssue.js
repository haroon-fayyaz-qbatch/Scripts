require("dotenv/config")
require("./utils/prototypes")
const { Account, WarehouseChargeHistory } = require("./models")
const { map, groupBy, keys, filter } = require("lodash")
{
  const accountIds = map(
    Account._findAll({
      raw: true,
      attributes: ["id"]
    }),
    "id"
  )
  const pendingHistories = WarehouseChargeHistory._findAll({
    attributes: ["account_id"],
    where: { status: "pending", account_id: accountIds },
    raw: true
  })
  const groupedHistories = groupBy(pendingHistories, "account_id")
  const unPaidAccIds = keys(groupedHistories).map(x => +x)
  Account._update({ is_two_step_paid: false }, { where: { id: unPaidAccIds } })
  Account._update({ is_two_step_paid: true }, { where: { id: filter(accountIds, id => !unPaidAccIds.includes(id)) } })
  console.log("Done => unPaidAccIds: ", JSON.stringify(unPaidAccIds))
}
