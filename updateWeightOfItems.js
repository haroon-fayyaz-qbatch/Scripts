require("dotenv/config")

const { getSkusSuppliers } = require("./utils/matching")
const { getModels } = require("./utils/sequelizeHelper")
const { uniq, groupBy, startCase, merge, chunk } = require("lodash")
const { MARKET_PLACES } = require("./config/constants")

;(async () => {
  const { SourceOrder, SourceItem } = getModels(2)
  for (const platform of [MARKET_PLACES.amazon, MARKET_PLACES.walmart]) {
    const sourceOrders = await SourceOrder.fetchAll({
      raw: true,
      attributes: ["id", "marketplace_account_id", "store_name"],
      where: { store_name: platform, fulfillment_channel: "WH" },
      include: { model: SourceItem, required: true }
    })

    const accounts = groupBy(sourceOrders, "marketplace_account_id")
    for (const account in accounts) {
      const skus = uniq(
        accounts[account].reduce((acc, order) => {
          order.source_items.forEach(item => acc.push(item.sku))
          return acc
        }, [])
      )
      const skusObj = {}
      for (const skusArr of chunk(skus, 20)) {
        const suppliers = await getSkusSuppliers({
          partnerId: +account,
          email: "matt@sceptermarketing.com",
          skus: skusArr,
          platform
        })
        merge(skusObj, suppliers?.results)
      }
      for (const sku in skusObj) {
        const supplier = skusObj[sku]?.find(x => x.is_default === 1)
        const data = merge(
          { weight: supplier.weight },
          supplier?.weight_unit && { weight_unit: startCase(supplier?.weight_unit?.toLowerCase()) + "s" }
        )
        await SourceItem.update(data, {
          where: { sku, marketplace_account_id: account }
        })
      }
    }
  }
})()
