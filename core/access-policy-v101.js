// FEZI Studio public access policy. Contains no keys or payment credentials.
export const ACCESS_POLICY = Object.freeze({
  "releaseVersion": "1.01",
  "free": {
    "feziStudio": true,
    "feziAgent": true,
    "chat": true,
    "appBuilder": true,
    "websiteBuilder": true,
    "androidExport": true,
    "imageStudio": true,
    "videoStudio": true,
    "telegramBotBuilder": true,
    "toolIntegrations": true,
    "modelAutoRouting": true
  },
  "paid": {
    "arinaOptionalServices": true,
    "apiKeyPurchases": true,
    "apiCreditTopUp": true
  },
  "publicPaidCategories": [
    "arina_optional",
    "api_keys",
    "api_topup"
  ],
  "otherPublicServicesPaywalled": false,
  "upstreamCosts": "Provider inference may cost the operator, even when free to visitors. Select verified free models first, apply rate limits, budgets and safe failure responses.",
  "runtimeGuarantee": "The free policy does not imply unlimited GPU or guaranteed free upstream inference; unavailable providers must not produce fabricated results."
});
export const isPaidCategory = (category) => ACCESS_POLICY.publicPaidCategories.includes(String(category || ''));
