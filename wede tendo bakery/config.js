"use strict";

window.TENDO_CONFIG = Object.freeze({
  businessName: "Tendo Bakery",
  contactEmail: "contact@tendobakery.co.za",
  address: "123 Baker Street, Elim, Limpopo, 0960, South Africa",
  latitude: -23.1601,
  longitude: 30.0524,

  websiteBaseUrl: "https://tendobakery.co.za",

  // Change to "live" only after configuring and testing real endpoints.
  submissionMode: "demo",

  // Your homepage URL is not automatically a form-processing endpoint.
  profileEndpoint: "",
  contactEndpoint: "",
  enquiryEndpoint: "",

  requestTimeoutMs: 15000
});