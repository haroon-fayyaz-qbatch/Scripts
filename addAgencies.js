const {
  Account,
  User,
  Sequelize: { Op }
} = require("./models")
const { map } = require("lodash")
;(async () => {
  const emails = [
    "lnlimaging@gmail.com",
    "davidrodasjr@outlook.com",
    "emeraldcityautomation@gmail.com",
    "phillinganesproducts@gmail.com",
    "steve@freelovemerchandise.com",
    "wethenorthab@gmail.com",
    "andres@idanicaseonline.com",
    "david@danmaroestore.com",
    "betterwayservices23@gmail.com",
    "timemarketdistribution@gmail.com",
    "andres@teruelestore.com",
    "Jrcybershopllc@gmail.com",
    "clevelandrehabs+1@gmail.com",
    "pcaffiliatesllc@gmail.com",
    "ridcounter2850@gmail.com",
    "tammy@leveragetoys.com",
    "nelsonmanagementmartllc@gmail.com",
    "industrygloballlc@gmail.com",
    "schneiderovitchmartllc@gmail.com",
    "tomas@overachievingservicesllc.com",
    "reddtradingshopllc@gmail.com",
    "jerrell@roseretailer.com",
    "jcpriches@gmail.com",
    "sankahomestorellc@gmail.com",
    "customerservice@sufianshop.com",
    "alpinium.llc+walmart@gmail.com",
    "archerskyesllc@gmail.com",
    "bluebuckventures@gmail.com",
    "DavidandDelwinstores@gmail.com",
    "dasdigitalsolutionsusa@gmail.com",
    "DominosDigitalSolutions@gmail.com",
    "amzwalmartauto@gmail.com",
    "wmmanebuy@gmail.com",
    "gogetitwally@gmail.com",
    "tagsupply21@gmail.com",
    "nzecommercecontact@gmail.com",
    "dcac6838@gmail.com",
    "jlouglobalenterprises@gmail.com",
    "wbargains2shop@gmail.com",
    "matthewbrannan @hotmail.com"
  ]
  const sanitzeEmails = emails.map(email => email.replace(/\s/g, ""))
  const accounts = await Account.fetchAll({
    raw: true,
    include: [
      {
        model: User,
        attributes: ["id", "email", "username"],
        required: true,
        email: { [Op.notIn]: sanitzeEmails }
      }
    ],
    attributes: ["id", "email", "agency_id"],
    where: { email: sanitzeEmails }
  })
  const accountEmails = await Account.findAll({
    raw: true,
    attributes: ["email"],
    where: {
      email: map(
        accounts.filter(x => x.agency_id !== 10),
        "email"
      )
    }
  })
  console.log("accountEmails: ", map(accountEmails, "email"))
  console.log("total Emails: ", sanitzeEmails.length, " total accounts: ", accounts.length)
  // console.log("accounts Data: ", JSON.stringify(accounts))
})()
