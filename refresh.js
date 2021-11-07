require("dotenv/config")
require("../utils/prototypes")
const moment = require("moment")
const { chunk, groupBy, keys, flatMap, flatten, startCase, concat, reduce, values, map, forEach } = require("lodash")
const { query: runQuery, Account, Statistic } = require("../models")
const { getRefreshableListingCount } = require("../utils/matching")
const { allSchemas, getModels } = require("../utils/sequelizeHelper")
const { parseMessage } = require("../utils/logger")
const { sleep } = require("../utils/common")
const { Op } = require("sequelize")
const { SOURCE_ORDER_STATUSES, MARKETPLACE_STATUSES, SUPPLIER_ORDER_STATUSES } = require("../config/constants")

const calculateCost = order =>
  reduce(
    order.supplier_orders,
    (acc, x) => {
      let price = x.cost
      price *= x.qty || 1
      price += x.tax
      price += x.shipping_cost
      price -= x.promotions
      return acc + price
    },
    0
  )

const calculateSale = order =>
  reduce(
    order.source_items,
    (acc, x) => {
      let price = x.price
      price *= x.qty
      price *= 1 - x.comission
      price += x.shipping
      price += x.refund
      return acc + price
    },
    0
  )

const calculateProfitAndRoi = async accountIds => {
  const allStats = []
  for (const tenantId of accountIds) {
    const { SourceOrder, SupplierOrder, MarketplaceAccount, SourceItem } = getModels(tenantId)
    const sourceOrders = await SourceOrder.fetchAll({
      attributes: ["id", "marketplace_account_id"],
      where: {
        status: { [Op.notIn]: [SOURCE_ORDER_STATUSES.cancelled, SOURCE_ORDER_STATUSES.refund] },
        marketplace_status: { [Op.ne]: MARKETPLACE_STATUSES.Cancelled }
      },
      include: [
        {
          attributes: ["cost", "qty", "tax", "shipping_cost", "promotions"],
          model: SupplierOrder,
          where: { status: SUPPLIER_ORDER_STATUSES.processed }
        },
        {
          attributes: [],
          required: true,
          model: MarketplaceAccount
        },
        {
          attributes: ["qty", "comission", "shipping", "refund", "price"],
          required: true,
          model: SourceItem
        }
      ]
    })
    const groupedData = groupBy(sourceOrders, "marketplace_account_id")
    const stats = await keys(groupedData).parallel(async i => {
      const profit = reduce(groupedData[i], (acc, curr) => acc + calculateSale(curr) - calculateCost(curr), 0)
      const cost = reduce(groupedData[i], (acc, curr) => acc + calculateCost(curr), 0)
      return {
        partner_id: i,
        tenant_id: tenantId,
        total_profits: profit ? toF(profit) : 0,
        total_roi: cost ? toF((profit / cost) * 100) : 0
      }
    }, 20)
    allStats.push(stats)
  }
  return flatten(allStats)
}

const print = (...msg) => {
  const lines = parseMessage(msg).split("\n")
  lines.forEach(msgLine => console.log(moment().format(), msgLine))
}
const toF = num => +num.toFixed(2)

const groupByTenantId = (arr, index, fullArr) => {
  const tenantWise = groupBy(arr, "tenantId")
  forEach(keys(tenantWise), id => {
    tenantWise[id] =
      index === fullArr?.length - 1 || !fullArr
        ? reduce(tenantWise[id], (obj, store) => ({ ...obj, [store.id]: store.except("id", "tenantId") }), {})
        : map(tenantWise[id], y => y.except("tenantId"))
  })
  return tenantWise
}

const groupByPartnerId = arr => {
  const tenantWise = groupBy(arr, "tenant_id")
  forEach(keys(tenantWise), tenantId => {
    const partnerWise = groupBy(tenantWise[tenantId], "partner_id")
    forEach(keys(partnerWise), id => {
      partnerWise[id] = reduce(partnerWise[id], (obj, stats) => ({ ...obj, ...stats }), {})
    })
    tenantWise[tenantId] = values(partnerWise)
  })
  return tenantWise
}

const normalize = (arr, col = "stats") => flatten(arr).sort((a, b) => b[col] - a[col])

const fetchAllSales = async accountIds => {
  const allSales = []
  for (const tenantIds of chunk(accountIds, 100)) {
    const queries = [
      // sales
      id => `
        (SELECT SUM((si.price * si.qty * (1 - si.comission)) + si.shipping + si.refund) AS Sales, so.marketplace_account_id, '${id}' AS tenantId
        FROM \`tenant_${id}.source_items\` AS si
        INNER JOIN \`tenant_${id}.source_orders\` AS so ON so.id = si.source_order_id
        WHERE so.marketplace_account_id IS NOT NULL
        AND so.status NOT IN ('cancelled', 'refund')
        AND so.marketplace_status != 'Cancelled'
        GROUP BY so.marketplace_account_id)`,
      id => `(SELECT id, name, marketplace, '${id}' AS tenantId FROM \`tenant_${id}.marketplace_accounts\`)`
    ]
    const allDataArr = await Promise.all(queries.map(query => runQuery(tenantIds.map(query).join(" UNION ALL "))))
    const [sales, stores] = await allDataArr.parallel(groupByTenantId)
    const salesPredicate = (value, tenantId) =>
      value.map(x => {
        const store = stores[tenantId][x.marketplace_account_id]
        return {
          identifier: store.name,
          partner_id: x.marketplace_account_id,
          marketplace: startCase(store.marketplace),
          total_sales: x.Sales ? toF(x.Sales) : 0,
          tenant_id: +tenantId
        }
      })

    allSales.push(flatMap(sales, salesPredicate))
  }
  return normalize(allSales)
}

const fetchListings = async (accounts, type) => {
  const allLisings = []
  for (const tenants of chunk(accounts, 100)) {
    const results = await Promise.allSettled(
      map(tenants, async tenant => ({
        id: tenant.id,
        email: tenant.email,
        res: await getRefreshableListingCount(tenant.email)
      }))
    )
    const tenantIds = map(tenants, tenant => tenant.id)
    const query = id => `(SELECT id, name, marketplace, '${id}' AS tenantId FROM \`tenant_${id}.marketplace_accounts\`)`
    const stores = groupByTenantId(await runQuery(tenantIds.map(query).join(" UNION ALL ")))
    const listingPredicate = ({ value }) => {
      const res = groupBy(value.res?.results, "partner_id")
      return map(keys(res), key => {
        return {
          tenant_id: value.id,
          partner_id: +res[key][0].partner_id,
          identifier: stores[value.id][res[key][0].partner_id]?.name,
          marketplace: res[key][0].marketplace,
          total_listings: res[key][0]?.listings_count || 0
        }
      })
    }
    allLisings.push(flatMap(results, listingPredicate))
  }
  return normalize(allLisings)
}

const fetchProfitsPerListingAndItem = async (accounts) => {
  const emails = reduce(accounts, (obj, acc) => {
    obj[acc.id] = acc.email
    return obj
  }, {})
  const allProfits = []
  for (const tenant of accounts) {
    const { SourceOrder, SupplierOrder, SourceItem } = getModels(tenant.id)
    const sourceOrders = await SourceItem.fetchAll({
      attributes: ["sku", "qty", "comission", "shipping", "refund", "price"],
      required: true,
      include: [
        {
          attributes: ["cost", "qty", "tax", "shipping_cost", "promotions"],
          model: SupplierOrder,
          where: { status: SUPPLIER_ORDER_STATUSES.processed }
        },
        {
          attributes: [],
          where: { marketplace_account_id: { [Op.ne]: null } },
          model: SourceOrder
        }
      ],
      where: { sku: { [Op.ne]: null } }
    })
    const groupedData = groupBy(sourceOrders, "sku")
    const queries = [
      // profits per listings
      id => `
      (SELECT SUM(((si.price * si.qty * (1 - si.comission)) + si.shipping + si.refund) - ((sup.cost * CEILING(IFNULL(sup.qty, 1) / IFNULL(sup.qty_multiplier, 1))) + sup.tax + sup.shipping_cost - sup.promotions)) AS Profits, si.sku, '${id}' AS tenantId
      FROM \`tenant_${id}.source_items\` si
      INNER JOIN \`tenant_${id}.supplier_orders\` AS sup ON sup.source_order_id = si.source_order_id
      INNER JOIN \`tenant_${id}.source_orders\` AS so ON si.source_order_id = so.id
      WHERE so.marketplace_account_id IS NOT NULL
      AND so.status NOT IN ('cancelled', 'refund')
      AND so.marketplace_status != 'Cancelled'
      AND sup.status = 'processed' AND si.sku IS NOT NULL
      GROUP BY si.sku, si.marketplace_account_id
      HAVING Profits > 0
      LIMIT 20)`,
      // profits per item
      id => `(SELECT SUM(((si.price * si.qty * (1 - si.comission)) + si.shipping + si.refund) - ((sup.cost * CEILING(IFNULL(sup.qty, 1) / IFNULL(sup.qty_multiplier, 1))) + sup.tax + sup.shipping_cost - sup.promotions)) AS Profits, '${id}' AS tenantId
      FROM \`tenant_${id}.source_items\` si
      INNER JOIN \`tenant_${id}.supplier_orders\` AS sup ON sup.source_order_id = si.source_order_id
      INNER JOIN \`tenant_${id}.source_orders\` AS so ON si.source_order_id = so.id
      WHERE so.marketplace_account_id IS NOT NULL
      AND so.status NOT IN ('cancelled', 'refund')
      AND so.marketplace_status != 'Cancelled'
      AND sup.status = 'processed' AND si.sku IS NOT NULL
      GROUP BY si.source_order_id
      HAVING Profits > 0
      LIMIT 20)`
    ]
    const allDataArr = await Promise.all(
      map(queries, query => runQuery(map(tenants, tenant => query(tenant.id)).join(" UNION ALL ")))
    )
    const [profitsPerListing, profitsPerItem] = await allDataArr.parallel(x => groupBy(x, "tenantId"))
    const listingPredicate = (row, tenantId) => {
      return row.map((x, index) => {
        return {
          tenant_id: tenantId,
          identifier: emails[tenantId],
          other_key: x.sku,
          total_profit_per_listings: toF(x.Profits),
          total_profit_per_item: toF(profitsPerItem[tenantId][index].Profits)
        }
      })
    }
    allProfits.push(flatMap(profitsPerListing, listingPredicate))
  }
  return normalize(allProfits)
}

const reports = [
  { name: "stats", func: fetchAllSales },
  { name: "listings", func: fetchListings, tenantWise: true },
  { name: "profit_per_listing", func: fetchProfitsPerListingAndItem, tenantWise: true },
  { name: "calculateProfitAndRoi", func: calculateProfitAndRoi }
]

;(async () => {
  try {
    const statTypes = ["sales", "profits", "listings", "roi"]
    print("START")
    const accountIds = await allSchemas("marketplace_accounts", { justIds: true })
    const accounts = await Account.findAll({ raw: true, attributes: ["id", "email"], where: { id: accountIds } })
    const funcResults = []
    print("Total Tenants:", accountIds.length)
    for (const report of reports) {
      const startTime = moment()
      print(`\nfetching ${report.name} report`)

      const inputArr = report.tenantWise ? accounts : accountIds
      const results = await report.func(inputArr, report.name)

      print("time took:", moment().diff(startTime, "seconds"), "seconds")
      print("found results:", results.length)
      funcResults[report.name] = results
    }
    let newArr = groupByPartnerId(concat(funcResults.stats, funcResults.listings, funcResults.calculateProfitAndRoi))
    newArr = await values(newArr).parallel(
      async value =>
        await value.parallel(i => {
          statTypes.forEach(stat => {
            if (!i[`total_${stat}`]) i[`total_${stat}`] = 0
          })
          return i
        }, 20)
    )
    await Statistic.destroy({ truncate: true })
    const allData = concat(Object.values(newArr), funcResults.profit_per_listing)
    await Statistic.bulkCreate(flatten(allData))
    print("records inserted")
  } catch (err) {
    print("Err:", err)
  } finally {
    print("DONE")
    await sleep(1)
    process.exit(1)
  }
})()
