function fillDefaultCard() {
  document.getElementById("card_number").value = 4242424242424242;
  document.getElementById("card_expiration_month").value = 01;
  document.getElementById("card_expiration_year").value = 2024;
  document.getElementById("card_cvc").value = 123;
  document.getElementById("card_type").value = "Visa";
}

function fill3DSCard() {
  document.getElementById("card_number").value = 4000002500003155;
  document.getElementById("card_expiration_month").value = 01;
  document.getElementById("card_expiration_year").value = 2024;
  document.getElementById("card_cvc").value = 123;
  document.getElementById("card_type").value = "Visa";
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

const loadHpmParams = async () => {
  const form = document.getElementById("directPostForm");

  fetch("/zuora/hpmParams", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
  })
    .then((response) => response.json())
    .then((params) => {
      form.elements.id.value = params.hpmPageId;
      form.elements.field_accountId.value = params.zuoraAccountId;
      form.elements.tenantId.value = params.tenantId;
      form.elements.signature.value = params.signature;
      form.elements.token.value = params.token;
      form.elements.field_key.value = params.key;

      window.publicKey = params.key;
    });
};

const setupPaymentMethod = async (form) => {
  const data = {
    type: "card",
    card: {
      number: form.elements.card_number.value,
      exp_month: form.elements.card_expiration_month.value,
      exp_year: form.elements.card_expiration_year.value,
      cvc: form.elements.card_cvc.value,
    },
  };
  const response = await fetch("/stripe/setupPaymentMethod", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
    body: JSON.stringify(data),
  });
  return response.json();
};

const setupIntends = async (paymentMethodId) => {
  const data = {
    confirm: true,
    payment_method_types: ["card"],
    payment_method: paymentMethodId,
    usage: "off_session",
    return_url: "http://localhost:3200/confirm3ds",
  };
  const response = await fetch("/stripe/setupIntends", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
    body: JSON.stringify(data),
  });
  return response.json();
};

const retrieveSetupIntent = async (setupIntentsId) => {
  const data = {
    setupIntentsId,
  };
  const response = await fetch("/stripe/retrieveSetupIntent", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
    body: JSON.stringify(data),
  });
  return response.json();
};

// https://stripe.com/docs/payments/3d-secure#manual-redirect
const on3DSComplete = async (setupIntentsId) => {
  // Hide the 3DS UI
  document.getElementById("3dsContainer")?.remove();
  retrieveSetupIntent(setupIntentsId).then((data) => {
    const form = document.getElementById("directPostForm");
    const networkTransactionId =
      data.latest_attempt.payment_method_details.card.network_transaction_id;
    form.elements.field_mitNetworkTransactionId.value = networkTransactionId;

    const encryptedValue = buildEncryptedValues(
      form.elements.card_number.value,
      form.elements.card_cvc.value,
      form.elements.card_expiration_month.value,
      form.elements.card_expiration_year.value
    );
    form.elements.encrypted_values.value = encryptedValue;
    form.submit();
  });
};

const submitDirectPost = async () => {
  const form = document.getElementById("directPostForm");

  const paymentMethodResponse = await setupPaymentMethod(form);
  const setupIntendsResponse = await setupIntends(paymentMethodResponse.id);
  if (
    setupIntendsResponse.status === "requires_action" &&
    setupIntendsResponse.next_action
  ) {
    const url = setupIntendsResponse.next_action.redirect_to_url.url;
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.width = "600";
    iframe.height = "600";
    document.getElementById("3dsContainer")?.appendChild(iframe);
  } else {
    const retrieveSetupIntentResponse = await retrieveSetupIntent(
      setupIntendsResponse.id
    );
    const networkTransactionId =
      retrieveSetupIntentResponse.latest_attempt.payment_method_details.card
        .network_transaction_id;
    form.elements.field_mitNetworkTransactionId.value = networkTransactionId;

    const encryptedValue = buildEncryptedValues(
      form.elements.card_number.value,
      form.elements.card_cvc.value,
      form.elements.card_expiration_month.value,
      form.elements.card_expiration_year.value
    );
    form.elements.encrypted_values.value = encryptedValue;
    form.submit();
  }
};

window.onload = () => {
  loadHpmParams();

  window.addEventListener(
    "message",
    function (e) {
      if (e.data.event_id === "3DS-authentication-complete") {
        on3DSComplete(e.data.setup_intent);
      }
    },
    false
  );
};
