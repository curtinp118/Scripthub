/******************************
脚本名称：Fine Pro会员解锁
Version  : v1.1.0
更新时间：2026-10-17
作者：Curtinp118
Platform : Quantumult X / Loon / Surge
脚本功能：解锁 Fine Pro 会员
使用说明：MITM 重写 subscribers 和 receipts 接口响应，打开 App 即可生效

[rewrite_local]
^https?:\/\/api\.rc-backup\.com\/v1\/(subscribers\/[^/]+|receipts)$ url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/finepro/finepro.js

[MITM]
hostname = api.rc-backup.com
*******************************/

// ========== 三端平台识别 ==========
var isQX = typeof $task !== "undefined";
var isLoon = typeof $loon !== "undefined";
var isSurge = typeof $httpClient !== "undefined" && !isLoon;

// ========== Logger 模块 ==========
var Logger = {
  scriptStart: function (name, version, platform, requestType) {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var time = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    console.log("🚀 Script Start");
    console.log("Time     : " + time);
    console.log("Version  : " + version + " | " + platform + " | " + requestType);
    console.log("Platform : " + platform);
    console.log("------------------------------------");
  },

  field: function (label, value) {
    var padding = "              ";
    var key = (label + padding).substring(0, 14);
    console.log(key + ": " + value);
  },

  status: function (icon, text) { this.field("Status", icon + " " + text); },
  message: function (value) { this.field("Message", value); },
  separator: function () { console.log("------------------------------------"); },
  summary: function (total, success, failed, result) {
    console.log("📊 Summary");
    console.log("Total      : " + total);
    console.log("Success    : " + success);
    console.log("Failed     : " + failed);
    console.log("🎯 Result  : " + result);
    console.log("End");
  }
};

// ========== 工具函数 ==========
var SCRIPT_NAME = "Fine Pro";
var SCRIPT_VERSION = "v1.1.0";
var ENTITLEMENT_ID = "Fine Pro";
var PRODUCT_ID = "fine_subscription_yearly";
var EXPIRES_DATE = "2099-12-30T23:59:59Z";
var FALLBACK_USER_ID = "$RCAnonymousID:00000000000000000000000000000000";

function getPlatform() {
  if (isQX) return "Quantumult X";
  if (isLoon) return "Loon";
  if (isSurge) return "Surge";
  return "Unknown";
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getResponseBody() {
  return typeof $response !== "undefined" && $response.body ? $response.body : "";
}

function parseResponse(raw) {
  if (!raw) return {};

  try {
    var parsed = JSON.parse(raw);
    return isObject(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function getPurchaseDate(subscription, now) {
  if (isObject(subscription) && subscription.purchase_date) {
    return subscription.purchase_date;
  }
  return now;
}

function buildResponse(raw) {
  var now = new Date().toISOString();
  var body = parseResponse(raw);
  if (!body) return null;

  var subscriber = isObject(body.subscriber) ? body.subscriber : {};
  var entitlements = isObject(subscriber.entitlements) ? subscriber.entitlements : {};
  var subscriptions = isObject(subscriber.subscriptions) ? subscriber.subscriptions : {};
  var existingSubscription = isObject(subscriptions[PRODUCT_ID]) ? subscriptions[PRODUCT_ID] : {};
  var purchaseDate = getPurchaseDate(existingSubscription, now);

  entitlements[ENTITLEMENT_ID] = {
    expires_date: EXPIRES_DATE,
    product_identifier: PRODUCT_ID,
    purchase_date: purchaseDate
  };

  subscriptions[PRODUCT_ID] = {
    expires_date: EXPIRES_DATE,
    original_purchase_date: existingSubscription.original_purchase_date || purchaseDate,
    purchase_date: purchaseDate,
    ownership_type: existingSubscription.ownership_type || "PURCHASED",
    period_type: existingSubscription.period_type || "normal",
    store: existingSubscription.store || "app_store",
    is_sandbox: false
  };

  subscriber.entitlements = entitlements;
  subscriber.subscriptions = subscriptions;
  subscriber.non_subscriptions = isObject(subscriber.non_subscriptions) ? subscriber.non_subscriptions : {};
  subscriber.other_purchases = isObject(subscriber.other_purchases) ? subscriber.other_purchases : {};
  subscriber.original_app_user_id = subscriber.original_app_user_id || FALLBACK_USER_ID;
  subscriber.first_seen = subscriber.first_seen || now;
  subscriber.last_seen = now;
  subscriber.original_purchase_date = subscriber.original_purchase_date || purchaseDate;
  subscriber.original_application_version = subscriber.original_application_version || "5001";

  if (typeof subscriber.management_url === "undefined") {
    subscriber.management_url = null;
  }

  body.request_date = now;
  body.request_date_ms = Date.now();
  body.subscriber = subscriber;
  return body;
}

function done(body) {
  $done({
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache"
    },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

function run() {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Response");
  var raw = getResponseBody();
  var body = buildResponse(raw);

  if (!body) {
    Logger.status("❌", "JSON parse error");
    Logger.separator();
    Logger.summary(1, 0, 1, "Invalid response");
    return done(raw);
  }

  Logger.status("✅", "VIP unlocked");
  Logger.message("Expire at " + EXPIRES_DATE);
  Logger.separator();
  Logger.summary(1, 1, 0, "Success");
  return done(body);
}

try {
  run();
} catch (error) {
  console.log("fatal:", error);
  done(getResponseBody());
}
