// Firebase Database Structure for Pizza Ria Call Gateway
// Run this once to initialize config in Firebase

// Config node - Android app reads phone numbers from here
// Update these values as needed:

const config = {
  "/config": {
    "primaryNumber": "+998911700916",
    "secondaryNumber": "+998943941919",
    "gatewaySim": "+998943941919",
    "updatedAt": Date.now()
  }
};

// Orders node - Railway backend pushes orders here
// Structure:
// /orders/{orderId} = {
//   status: "NEW" | "CALLING" | "CALLED",
//   items: "2x Burger, 1x Cola",
//   total: 85000,
//   callNumbers: ["+998911700916", "+998943941919"],
//   gatewaySim: "+998943941919",
//   customerName: "Jamshid",
//   customerPhone: "+998911700916",
//   district: "Chinobod",
//   paymentType: "Naqd",
//   orderNumber: 152,
//   createdAt: 1750000000000
// }

module.exports = config;
