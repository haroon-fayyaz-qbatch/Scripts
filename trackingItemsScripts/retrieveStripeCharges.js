require("./utils/prototypes")
require("dotenv/config")
const moment = require("moment")
const { isExists, createDir } = require("./utils/dir")
const { Account, TrackingItem, Sequelize } = require("./models")
const { STRIPE_KEY, STRIPE_TEST_KEY, DEFAULT_TENANT } = process.env
const Stripe = require("stripe")(STRIPE_KEY)
const testStripe = require("stripe")(STRIPE_TEST_KEY)
const fs = require("fs")
const { map } = require("lodash")

;(async () => {
  try {
    const trackingItems = await TrackingItem.findAll({
      raw: true,
      where: { wh_tracking_number: { [Sequelize.Op.ne]: null } },
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("account_id")), "account_id"]]
    })
    const accountIds = map(trackingItems, "account_id")

    const accounts = await Account.findAll({
      raw: true,
      attribute: ["id", "email", "stripe_customer_id", "alt_payment"],
      where: { id: accountIds }
    })
    if (!accounts.length) {
      console.log("No Accounts found")
      return
    }
    await accounts.parallel(async acc => {
      const { id, email, stripe_customer_id: customerId } = acc
      const isDefaultTenant = id === +DEFAULT_TENANT
      const chargeObj = {
        stripe: isDefaultTenant ? testStripe : Stripe,
        customerId: isDefaultTenant ? "cus_Ks9vKsGZw0il1B" : customerId,
        email: isDefaultTenant ? "matt@sceptermarketing.com" : email
      }

      let chargeHistories = await chargeObj.stripe.charges.list({
        limit: 30
      })
      chargeHistories = chargeHistories?.data?.map(x => ({
        amount: x.amount,
        description: x.description,
        metadata: x.metadata,
        created: moment.unix(x.created).format("YYYY-MM-DD HH:mm")
      }))
      if (!isExists("./StripeWHCharges/")) createDir("./StripeWHCharges/")

      fs.writeFileSync(`StripeWHCharges/charge_${id}.json`, JSON.stringify(chargeHistories))
    })
  } catch (error) {
    console.log(error)
  }
})()
