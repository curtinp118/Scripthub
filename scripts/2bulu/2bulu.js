/******************************
脚本名称：两步路VIP解锁
Version  : v1.0.0
更新时间：2026-07-07
作者：Curtinp118
Platform : Quantumult X / Loon / Surge
脚本功能：解锁两步路 VIP/SVIP 会员信息

使用说明：
打开两步路会员页即可生效。

[rewrite_local]
^https:\/\/h5\.2bulu\.com\/api\/v9\/vip\/myVipInfo\?userId=[^&]+ url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/2bulu/2bulu.js
^https:\/\/helper\.2bulu\.com\/vip\/message(?:\?.*)?$ url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/2bulu/2bulu.js

[MITM]
hostname = h5.2bulu.com, helper.2bulu.com
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

// ========== 工具函数 ==========
var SCRIPT_NAME = "两步路";
var SCRIPT_VERSION = "v1.0.0";
var EXPIRE_TIME = 4102358400000;
var EXPIRE_DATE = "2099-12-31";
var MESSAGE_SUB_TITLE = "𝑮𝒓𝒆𝒆𝒏 𝑺𝒄𝒓𝒊𝒑𝒕𝑯𝒖𝒃 ,TG：@iOSScripthub";
var MESSAGE_LINK_NAME = "已开通";

var MEMBER_LIST = [
  {
    vipType: 1,
    vipName: "VIP",
    autoRenewal: false,
    vipExpireTime: EXPIRE_TIME,
    vipExpireDate: EXPIRE_DATE,
    nextRenewalDate: null,
    vip: true
  },
  {
    vipType: 2,
    vipName: "SVIP",
    autoRenewal: false,
    vipExpireTime: EXPIRE_TIME,
    vipExpireDate: EXPIRE_DATE,
    nextRenewalDate: null,
    vip: true
  }
];

function getPlatform() {
  if (isQX) return "Quantumult X";
  if (isLoon) return "Loon";
  if (isSurge) return "Surge";
  return "Unknown";
}

function done(body) {
  $done({ body: typeof body === "string" ? body : JSON.stringify(body) });
}

function getRequestUrl() {
  var url = typeof $request !== "undefined" && $request.url ? $request.url : "";
  return url;
}

function isVipInfoUrl(url) {
  return url.indexOf("https://h5.2bulu.com/api/v9/vip/myVipInfo?userId") === 0;
}

function isVipMessageUrl(url) {
  return url.indexOf("https://helper.2bulu.com/vip/message") === 0;
}

function hasVipInfo(body) {
  return body && body.data && typeof body.data === "object" && Array.isArray(body.data.memberList);
}

function hasVipMessage(body) {
  return body && body.data && typeof body.data === "object" && Object.prototype.hasOwnProperty.call(body.data, "linkName");
}

function patchVipInfo(body) {
  if (!hasVipInfo(body)) return false;

  body.data.memberList = MEMBER_LIST;
  return true;
}

function patchVipMessage(body) {
  if (!hasVipMessage(body)) return false;

  body.data.subTitle = MESSAGE_SUB_TITLE;
  body.data.linkName = MESSAGE_LINK_NAME;
  return true;
}

function run() {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Response");

  var raw = typeof $response !== "undefined" && $response.body ? $response.body : "";
  if (!raw) {
    Logger.status("❌", "Empty response body");
    return done("");
  }

  var body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    Logger.status("❌", "JSON parse error");
    return done(raw);
  }

  var url = getRequestUrl();
  var noRequest = typeof $request === "undefined";

  if (isVipInfoUrl(url) || (noRequest && hasVipInfo(body))) {
    if (patchVipInfo(body)) {
      Logger.status("✅", "VIP unlocked");
      Logger.message("Expire at " + EXPIRE_DATE);
      Logger.separator();
      Logger.summary(1, 1, 0, "Success");
      return done(body);
    }

    Logger.status("⚠️", "Unexpected response structure");
    Logger.separator();
    Logger.summary(1, 0, 1, "No data field");
    return done(raw);
  }

  if (isVipMessageUrl(url) || (noRequest && hasVipMessage(body))) {
    if (patchVipMessage(body)) {
      Logger.status("✅", "Message patched");
      Logger.message(MESSAGE_SUB_TITLE);
      Logger.separator();
      Logger.summary(1, 1, 0, "Success");
      return done(body);
    }

    Logger.status("⚠️", "Unexpected response structure");
    Logger.separator();
    Logger.summary(1, 0, 1, "No message field");
    return done(raw);
  }

  Logger.status("ℹ️", "No matching endpoint");
  Logger.separator();
  Logger.summary(1, 0, 0, "Skipped");
  return done(raw);
}

try {
  run();
} catch (e) {
  console.log("fatal:", e);
  done(typeof $response !== "undefined" && $response.body ? $response.body : "");
}
