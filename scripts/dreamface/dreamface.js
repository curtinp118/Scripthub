/****************************** 
脚本功能：DreamFace - 解锁会员
Version  : v1.2.0
更新时间：2026-06-01
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
MITM 重写响应体，解锁 DreamFace 会员功能。

[rewrite_local]
https://www.dreamfaceapp.com/df-server/user/save_user_login url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/dreamface/dreamface.js

[MITM]
hostname = www.dreamfaceapp.com
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
  Logger.scriptStart("DreamFace", "v1.2.0", platform, "Response");

  var body = {
    data: {
      rights: {
        expires_date_format: "2099-09-09 19:27:05.000",
        vip_type: "TRY_YEAR_PACKAGE",
        have_trial: false,
        vip_remainder_day: 9999,
        vip_label: true,
        expires_date: 4092595200000
      },
      device_name: "iPhone13,3",
      system_version: "17.1.1",
      app_version: "3.0.0",
      app_package_name: "DreamFace",
      device_system: "iOS",
      country_code: "cn"
    },
    status_code: "THS12140000000",
    extend: {},
    status_msg: "Success"
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
