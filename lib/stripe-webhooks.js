function itemFromStripeLineItem(lineItem) {
  const productIdRaw =
    lineItem?.price?.product?.metadata?.product_id ||
    lineItem?.price?.metadata?.product_id ||
    lineItem?.metadata?.product_id;
  const productId = Number(productIdRaw);
  const quantity = Number(lineItem?.quantity || 1);
  if (!Number.isInteger(productId) || productId < 1) return null;
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  return { id: productId, quantity };
}

function checkoutItemsFromLineItems(lineItems) {
  if (!Array.isArray(lineItems)) return [];
  return lineItems.map(itemFromStripeLineItem).filter(Boolean);
}

function purchasePayloadFromSession({ session, lineItems, defaultSite = "beyondmythos.com" }) {
  const email = String(
    session?.customer_details?.email || session?.customer_email || session?.metadata?.email || ""
  )
    .trim()
    .toLowerCase();
  const site = String(session?.metadata?.site || defaultSite).trim().toLowerCase();
  return {
    email,
    site,
    provider: "stripe",
    providerSessionId: session?.id,
    status: "paid",
    items: checkoutItemsFromLineItems(lineItems)
  };
}

module.exports = {
  itemFromStripeLineItem,
  checkoutItemsFromLineItems,
  purchasePayloadFromSession
};
