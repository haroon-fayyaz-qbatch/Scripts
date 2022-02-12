require("dotenv/config")
const { getModels } = require("./utils/sequelizeHelper")
const fs = require("fs")
const amazonMws = require("amazon-mws")
const { DEFAULT_DEVELOPER_AWS_ACCESS_KEY, DEFAULT_DEVELOPER_AWS_SECRET_KEY, DEFAULT_AMAZON_USA_REGION } = process.env
const mwsAccessObj = amazonMws(DEFAULT_DEVELOPER_AWS_ACCESS_KEY, DEFAULT_DEVELOPER_AWS_SECRET_KEY)
const { getReport } = require("./utils/mws")

;(async () => {
  try {
    const { MarketplaceAccount } = getModels(3252)
    const store = await MarketplaceAccount.findByPk(1, { raw: true })
    // console.log("store: ", store)
    const { access_id: accessId, access_secret: accessSecret, aws_credentials: awsCredentials } = store
    const reqBody = {
      Version: "2009-01-01",
      Action: "GetReportList",
      MaxCount: 100,
      SellerId: accessId,
      MWSAuthToken: accessSecret,
      "ReportTypeList.Type.1": "_GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_",
      "MarketplaceId.Id.1": DEFAULT_AMAZON_USA_REGION
    }
    awsCredentials.marketplaces.forEach((id, index) => {
      reqBody["MarketplaceId.Id." + (index + 2)] = id
    })
    const res = await mwsAccessObj.reports.search(reqBody)
    const reports = res?.ReportInfo
    // console.log("reports: ", reports)
    await reports.parallel(async (report, i) => {
      const reportInfo = await getReport({ accessId, accessSecret, reportId: report.ReportId })
      const filteredReports = reportInfo.data.filter(report => report["item-related-fee-type"] === "Commission")
      fs.writeFileSync(`reports/amazon/reportsInfo_${i}.json`, JSON.stringify(filteredReports))
    })
    console.log("DONE==========")
  } catch (err) {
    console.log("error: ", err)
  }
})()
