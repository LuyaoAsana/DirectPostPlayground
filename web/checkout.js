function fillDefaultCard() {
  document.getElementById("card_number").value = 4242424242424242;
  document.getElementById("card_expiration_month").value = 01;
  document.getElementById("card_expiration_year").value = 2024;
  document.getElementById("card_cvc").value = 123;
  document.getElementById("field_creditCardType").value = "visa";
}

function fill3DSCard() {
  document.getElementById("card_number").value = 4000002500003155;
  document.getElementById("card_expiration_month").value = 01;
  document.getElementById("card_expiration_year").value = 2024;
  document.getElementById("card_cvc").value = 123;
  document.getElementById("field_creditCardType").value = "visa";
}

function buildEncryptedValues(
  creditCardNumber,
  cardSecurityCode,
  creditCardExpirationMonth,
  creditCardExpirationYear
) {
  // 1) Construct credit card data to a string in the desired format
  var unencrypted_values =
    "#" +
    creditCardNumber +
    "#" +
    cardSecurityCode +
    "#" +
    creditCardExpirationMonth +
    "#" +
    creditCardExpirationYear;

  // 2) Base64 encode the string, 3) Encrypt the Base64 string
  // and 4) Base64 encode the encrypted data
  return encryptText(unencrypted_values, window.publicKey);
}

/**
 * encrypt the text using the specified public key.
 * @param text the text to be encrypted.
 * @param key the public key.
 * @returns Base64 encoded encrypted data.
 */
function encryptText(text, key) {
  if (key) {
    try {
      var key = pidCryptUtil.decodeBase64(key);
      var rsa = new pidCrypt.RSA();
      //ASN1 parsing
      var asn = pidCrypt.ASN1.decode(pidCryptUtil.toByteArray(key));
      var tree = asn.toHexTree();

      //setting the public key for encryption with retrieved ASN.1 tree
      rsa.setPublicKeyFromASN(tree);

      // Base64 encode and encrypt the string
      var crypted = rsa.encrypt(text);

      return pidCryptUtil.encodeBase64(pidCryptUtil.convertFromHex(crypted));
    } catch (e) {
      console.info(e);
    }
  }
  // return origin text if unable to encrypt
  return text;
}

getZuoraAccountId = async () => {
  var request = new XMLHttpRequest();
  request.open("GET", "/api/zuoraAccount", false);
  request.setRequestHeader("content-Type", "application/json");
  request.onload = function () {
    const zuoraAccountId = JSON.parse(request.responseText).zuoraAccountId;
    document.getElementById("zuoraAccountId").value = zuoraAccountId;
  };
  request.send();
};

loadHpmParams = async (form) => {
  var request = new XMLHttpRequest();
  var zuoraAccountId = document.getElementById("zuoraAccountId").value;

  request.open("GET", `/api/hpmParams?zuoraAccountId=${zuoraAccountId}`, false);
  request.setRequestHeader("content-Type", "application/json");

  request.onload = function () {
    const hpmParams = JSON.parse(request.responseText).hpmParams;

    form.elements.id.value = hpmParams.id;
    form.elements.tenantId.value = hpmParams.tenantId;
    form.elements.signature.value = hpmParams.signature;
    form.elements.token.value = hpmParams.token;
    form.elements.field_accountId.value = hpmParams.field_accountId;
    form.elements.field_key.value = hpmParams.key;

    window.publicKey = hpmParams.key;
  };
  request.send();
};

function addStatusMsg(msg) {
  document.getElementById("statusText").value += msg + "\r\n";
}

setupPaymentMethod = async (form) => {
  //   fetch(`/api/setupPaymentMethod?card=${JSON.stringify(card)}`);

  var request = new XMLHttpRequest();
  const card = {
    number: form.elements.card_number.value,
    exp_month: form.elements.card_expiration_month.value,
    exp_year: form.elements.card_expiration_year.value,
    cvc: form.elements.card_cvc.value,
  };
  request.open(
    "GET",
    `/api/setupPaymentMethod?card=${JSON.stringify(card)}`,
    false
  );
  request.setRequestHeader("content-Type", "application/json");

  request.onload = function () {
    const paymentMethod = JSON.parse(request.responseText);
    addStatusMsg(request.responseText);
    document.getElementById("paymentMethodId").value = paymentMethod.id;
  };
  request.send();
};

setupIntends = async () => {
  var paymentMethodId = document.getElementById("paymentMethodId").value;
  var request = new XMLHttpRequest();
  request.open(
    "GET",
    `/api/setupIntends?paymentMethodId=${paymentMethodId}`,
    false
  );
  request.setRequestHeader("content-Type", "application/json");
  request.onload = function () {
    const setupIntends = JSON.parse(request.responseText);
    addStatusMsg(request.responseText);
    document.getElementById("setupIntentsId").value = setupIntends.id;
    document.getElementById("setupIntentsClientSecret").value =
      setupIntends.client_secret;
    if (setupIntends.status === "requires_action" && setupIntends.next_action) {
      document.getElementById("requiresAction").value = "TRUE";
      document.getElementById("3dsurl").value =
        setupIntends.next_action.redirect_to_url.url;
    } else {
      document.getElementById("requiresAction").value = "FALSE";
    }
  };
  request.send();
};

// https://stripe.com/docs/payments/3d-secure#manual-redirect
maybeVerify3DS = async () => {
  return new Promise((resolve) => {
    if (document.getElementById("requiresAction").value === "TRUE") {
      const url = document.getElementById("3dsurl").value;
      const iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.width = 600;
      iframe.height = 400;
      document.getElementById("3dsContainer").appendChild(iframe);
      resolve(true);
    } else {
      resolve(false);
    }
  });
};

on3DSComplete = () => {
  // Hide the 3DS UI
  document.getElementById("3dsContainer").remove();

  const setupIntentsId = document.getElementById("setupIntentsId").value;

  var request = new XMLHttpRequest();
  request.open(
    "GET",
    `/api/retrieveSetupIntent?setupIntentsId=${setupIntentsId}`,
    false
  );
  request.setRequestHeader("content-Type", "application/json");
  request.onload = function () {
    const setupIntend = JSON.parse(request.responseText);
    addStatusMsg(request.responseText);
    document.getElementById("networkTransactionId").value =
      setupIntend.latest_attempt.payment_method_details.card.network_transaction_id;

    const form = document.getElementById("directpost");
    form.elements.field_mitNetworkTransactionId.value = document.getElementById(
      "networkTransactionId"
    ).value;

    form.submit();
  };
  request.send();
};

const submitDirectPost = async () => {
  console.log(`Started: ${Date.now()}`);
  const form = document.getElementById("directpost");
  setupPaymentMethod(form);
  setupIntends();
  const shouldVerify = await maybeVerify3DS();

  getZuoraAccountId();
  loadHpmParams(form);
  const encryptedValue = buildEncryptedValues(
    form.elements.card_number.value,
    form.elements.card_cvc.value,
    form.elements.card_expiration_month.value,
    form.elements.card_expiration_year.value
  );
  form.elements.encrypted_values.value = encryptedValue;
  if (!shouldVerify) {
    form.submit();
  }
};

window.onload = () => {
  window.addEventListener(
    "message",
    function (ev) {
      if (ev.data === "3DS-authentication-complete") {
        on3DSComplete();
      }
    },
    false
  );
};
