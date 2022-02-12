const { getModels } = require("./utils/sequelizeHelper")
const { makeToken } = require("./utils/currentUser")
const { ORDER_TRACKING_STATUSES, SOURCE_ORDER_STATUSES } = require("./config/constants")

{
  const req = makeToken("SYSTEM", 2963)
  const { SupplierOrder, SourceOrder } = getModels(req)
  SourceOrder._update({ status: SOURCE_ORDER_STATUSES.wh_delivered }, { where: { id: 1 } })
  SupplierOrder._update({ tracking_status: ORDER_TRACKING_STATUSES.shipped }, { where: { source_order_id: 1 } })
  SupplierOrder._update(
    { tracking_status: ORDER_TRACKING_STATUSES.delivered },
    { where: { source_order_id: 1 }, individualHooks: true, req }
  )
}
