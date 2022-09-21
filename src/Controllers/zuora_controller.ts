import axios from "axios";
import dotenv from "dotenv";
import express from "express";
import qs from "qs";

export const zuoraController = express.Router();

interface DirectPostRequiredFields {
  field_key: string;
  field_style: "iframe";
  host: string;
  id: string;
  signature: string;
  tenantId: string;
  token: string;
}

interface DirectPostCreditCardFields {
  encrypted_fields: "#field_creditCardNumber#field_cardSecurityCode#field_creditCardExpirationMonth#field_creditCardExpirationYear";
  encrypted_values: string;
  field_creditCardAddress1: string;
  field_creditCardAddress2: string;
  field_creditCardCity: string;
  field_creditCardCountry: string; // Set it to a 3-digit ISO code
  field_creditCardHolderName: string;
  field_creditCardPostalCode: string;
  field_creditCardState: string; // State or province
  // Set to one of the following: "Visa", "MasterCard", "AmericanExpress", "Discover"
  field_creditCardType: string;
  field_email: string;
  field_phone: string;
}

zuoraController.post("/zuora/hpmParams", async function (req, res) {
  const hpmPageId = process.env.ZUORA_HPM_PAGE_ID;
  const zuoraAccountId = process.env.ZUORA_ACCOUNT_ID;
  const token = await axios({
    method: "post",
    url: "https://rest.apisandbox.zuora.com/oauth/token",
    data: qs.stringify({
      client_id: process.env.ZUORA_CLIENT_ID,
      client_secret: process.env.ZUORA_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
    headers: {
      "content-Type": "application/x-www-form-urlencoded",
    },
  });
  const accessToken = token.data.access_token;
  const params = await axios({
    method: "post",
    url: "https://rest.apisandbox.zuora.com/v1/rsa-signatures",
    data: {
      method: "POST",
      uri: "https://apisandbox.zuora.com/apps/PublicHostedPageLite.do",
      pageId: hpmPageId,
      accountId: zuoraAccountId,
    },
    headers: {
      "content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  res.send({
    hpmPageId,
    zuoraAccountId,
    tenantId: params.data.tenantId,
    signature: params.data.signature,
    token: params.data.token,
    key: params.data.key,
  });
});

zuoraController.post("/zuora/submitPayment", async function (req, res) {
  const directpost = await axios({
    method: "post",
    url: "https://apisandbox.zuora.com/apps/PublicHostedPageLite.do",
    data: req.body,
    headers: {
      "content-Type": "application/json",
    },
  });
  res.send(directpost);
});
