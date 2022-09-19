import axios from "axios";
import dotenv from "dotenv";
import express from "express";
import qs from "qs";

export const zuoraController = express.Router();

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
