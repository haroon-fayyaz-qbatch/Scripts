require("./utils/prototypes")
const { map } = require("lodash")
const { S3_STATUSES } = require("./config/constants")
const {
  Sequelize: { Op, where, fn, col }
} = require("./models")
const { getModels, allSchemas } = require("./utils/sequelizeHelper")
const responses = {}
;(async () => {
  const accIds = await allSchemas("s3_objects", { justIds: true })
  await accIds.parallel(async accId => {
    const { CustomerInfo, Email } = getModels(accId)
    const emails = await Email.findAll({
      attributes: ["s3_key"],
      include: [
        {
          model: CustomerInfo,
          required: true,
          attributes: [],
          where: {
            name: {
              [Op.notIn]: "Harry,Matt".split(",")
            }
          }
        }
      ],
      where: [
        { [Op.or]: [{ orderable_id: "" }, { orderable_id: null }] },
        { subject: { [Op.like]: "%Your Amazon.com order of %" } },
        where(fn("date_format", col("email_date"), "%Y-%m-%d"), ">=", "2022-01-05")
      ]
    })
    if (emails.length) {
      const count = await Email.update({ status: S3_STATUSES.pending }, { where: { s3_key: map(emails, "s3_key") } })
      responses[accId] = { total: emails.length, count }
    }
  })
})()
