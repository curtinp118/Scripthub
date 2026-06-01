/****************************** 
脚本功能：Notability - 解锁会员
Version  : v1.2.0
更新时间：2026-06-01
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
MITM 重写响应体，解锁 Notability 会员功能。

[rewrite_local]
^https?://notability\.com/(global|subscriptions) url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/notability/notability.js

[MITM]
hostname = notability.com
*******************************/

// ========== 三端适配层 ==========
var isQX = typeof $task !== "undefined";
var isLoon = typeof $loon !== "undefined";
var isSurge = typeof $httpClient !== "undefined" && !isLoon;

var $http = {
  fetch: function (opts) {
    if (isQX) return $task.fetch(opts);
    return new Promise(function (resolve, reject) {
      var method = (opts.method || "GET").toUpperCase();
      var handler = function (err, resp, data) {
        if (err) reject(err);
        else resolve({ statusCode: resp.statusCode, headers: resp.headers, body: data });
      };
      if (method === "POST") $httpClient.post(opts, handler);
      else $httpClient.get(opts, handler);
    });
  }
};

var $store = {
  read: function (key) { return isQX ? $prefs.valueForKey(key) : $persistentStore.read(key); },
  write: function (val, key) { return isQX ? $prefs.setValueForKey(val, key) : $persistentStore.write(val, key); }
};

var notifyFn = isQX
  ? function (t, s, b) { $notify(t, s, b); }
  : function (t, s, b) { $notification.post(t, s, b); };

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
  message: function (val) { this.field("Message", val); },
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

function getPlatform() {
  if (isQX) return "Quantumult X";
  if (isLoon) return "Loon";
  if (isSurge) return "Surge";
  return "Unknown";
}

function done(body) {
  $done({ body: typeof body === "string" ? body : JSON.stringify(body) });
}

function run() {
  var platform = getPlatform();
  Logger.scriptStart("Notability", "v1.2.0", platform, "Response");

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
          originalPurchaseDate: "2022-09-09T09:09:09.000Z"
        },
        __typename: "SubscriptionResult"
      }
    }
  };

  Logger.status("✅", "VIP unlocked");
  Logger.separator();
  Logger.summary(1, 1, 0, "Success");
  done(JSON.stringify(body));
}

try {
  run();
} catch (e) {
  console.log("fatal:", e);
  done($response?.body || "");
}
