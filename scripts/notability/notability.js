/****************************** 
脚本功能：Notability - 解锁会员
Version  : v1.1.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X

[rewrite_local]
^https?:\/\/notability\.com\/(global|subscriptions) url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/notability/notability.js

[mitm]
hostname = notability.com
*******************************/

var body = {
  data: {
    processAppleReceipt: {
      error: 0,
      subscription: {
        productId: "com.gingerlabs.Notability.premium_subscription",
        originalTransactionId: "570001184068302",
        tier: "premium",
        refundedDate: null,
        refundedReason: null,
        isInBillingRetryPeriod: false,
        expirationDate: "2999-09-09T09:09:09.000Z",
        gracePeriodExpiresAt: null,
        overDeviceLimit: false,
        expirationIntent: null,
        __typename: "AppStoreSubscription",
        user: null,
        status: "canceled",
        originalPurchaseDate: "2022-09-09T09:09:09.000Z",
      },
      __typename: "SubscriptionResult",
    },
  },
};

$done({ body: JSON.stringify(body) });
