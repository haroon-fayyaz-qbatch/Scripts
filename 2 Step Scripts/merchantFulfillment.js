require("dotenv/config")
const amazonMws = require("amazon-mws")
const { getModels } = require("./utils/sequelizeHelper")
const { DEFAULT_DEVELOPER_AWS_ACCESS_KEY, DEFAULT_DEVELOPER_AWS_SECRET_KEY, DEFAULT_AMAZON_USA_REGION } = process.env
const mwsAccessObj = amazonMws(DEFAULT_DEVELOPER_AWS_ACCESS_KEY, DEFAULT_DEVELOPER_AWS_SECRET_KEY)
;(async () => {
  try {
    const { MarketplaceAccount } = getModels(2)
    const store = await MarketplaceAccount.findByPk(3)
    if (!store) {
      console.log("No Marketplace account")
      return
    }
    const { access_id: accessId, access_secret: accessSecret, aws_credentials: awsCredentials } = store
    const reqBody = {
      Version: "2015-06-01",
      Action: "GetEligibleShippingServices",
      SellerId: accessId,
      MWSAuthToken: accessSecret,
      "ShipmentRequestDetails.AmazonOrderId": "114-0877788-4186601",
      "ShipmentRequestDetails.PackageDimensions.Length": 1.2,
      "ShipmentRequestDetails.PackageDimensions.Width": 2.1,
      "ShipmentRequestDetails.PackageDimensions.Height": 1.4,
      "ShipmentRequestDetails.PackageDimensions.Unit": "inches",
      "ShipmentRequestDetails.Weight.Value": 2.5,
      "ShipmentRequestDetails.Weight.Unit": "ounces",
      "ShipmentRequestDetails.ShipFromAddress.Name": "Matt Baumgartner",
      "ShipmentRequestDetails.ShipFromAddress.AddressLine1": "15790 AQUEDUCT LN",
      "ShipmentRequestDetails.ShipFromAddress.City": "CHINO HILLS",
      "ShipmentRequestDetails.ShipFromAddress.StateOrProvinceCode": "CA",
      "ShipmentRequestDetails.ShipFromAddress.PostalCode": " 91709-2851",
      "ShipmentRequestDetails.ShipFromAddress.CountryCode": "US",
      "ShipmentRequestDetails.ShipFromAddress.Email": "7yxwc3c8k00p1k3@marketplace.amazon.com",
      "ShipmentRequestDetails.ShipFromAddress.Phone": "+16198542705",
      "ShipmentRequestDetails.ShippingServiceOptions.DeliveryExperience": "DeliveryConfirmationWithSignature",
      "ShipmentRequestDetails.ShippingServiceOptions.CarrierWillPickUp": "true",
      "ShipmentRequestDetails.ItemList.Item.1.OrderItemId": "01286492572114",
      "ShipmentRequestDetails.ItemList.Item.1.Quantity": 1,
      "ShippingOfferingFilter.IncludeComplexShippingOptions": false
    }
    console.log("reqBody: ", reqBody)
    const results = await mwsAccessObj.merchantFulfillment.search(reqBody)
    console.log("results: ", JSON.stringify(results, null, 2))
  } catch (e) {
    console.log("error: ", e)
  }
})()
