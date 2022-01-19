require("./utils/prototypes")
const { uniqBy, difference } = require("lodash")
const { allSchemas } = require("./utils/sequelizeHelper")
const { query: runQuery } = require("./models")

  ; (async () => {
  const notification = "Select id FROM notifications"
  const notificationIds = uniqBy(await runQuery(notification), "id")
  const tenantIds = await allSchemas("users_notifications", { justIds: true })
  const query = (tenantIds.map(x => `SELECT notification_id FROM \`tenant_${x}.users_notifications\``)).join(" UNION ")
  const results = await runQuery(query)

  const uniqueIds = uniqBy(results, "notification_id")
  console.log("difference: ", difference(notificationIds, uniqueIds))
})()
