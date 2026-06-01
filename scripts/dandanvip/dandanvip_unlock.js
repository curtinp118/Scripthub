/****************************** 
脚本功能：蛋蛋不语 - 解锁会员
Version  : v1.1.0
更新时间：2026-06-01
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
添加到重写 解锁蛋蛋不语VIP会员功能。

[rewrite_local]
^http:\/\/38\.76\.202\.248:8000\/.*profiles.* url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/dandanvip/dandanvip_unlock.js

[MITM]
hostname = 38.76.202.248
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

var VIP_PATCH = {
  vip_status: true,
  vip_level: 3,
  vip_expire_at: "2099-09-19T22:21:06.147807+00:00",
  username: "TG@Curtinp118"
};

function patch(obj) {
  if (!obj || typeof obj !== "object") return obj;
  return Object.assign(obj, VIP_PATCH);
}

function done(body) {
  $done({ body: typeof body === "string" ? body : JSON.stringify(body) });
}

function run() {
  var platform = getPlatform();
  Logger.scriptStart("蛋蛋不语", "v1.1.0", platform, "Response");

  var raw = ($response && $response.body) ? $response.body : "";
  if (!raw) {
    Logger.status("❌", "Empty response body");
    return done("");
  }

  var data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    Logger.status("❌", "JSON parse error");
    return done(raw);
  }

  if (Array.isArray(data)) {
    data = data.map(patch);
  } else {
    data = patch(data);
  }

  Logger.status("✅", "VIP unlocked");
  Logger.separator();
  Logger.summary(1, 1, 0, "Success");
  done(data);
}

try {
  run();
} catch (e) {
  console.log("fatal:", e);
  done($response?.body || "");
}
