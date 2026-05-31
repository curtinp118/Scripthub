/****************************** 
脚本功能：中国移动 自动签到领奖
Version  : v1.2.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
访问中国移动签到页面保存 Cookie，定时任务自动签到领奖。

[rewrite_local]
^https?://wx\.10086\.cn/qwhdhub/ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cmcc/cmcc.js

[task_local]
35 8 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cmcc/cmcc.js, tag=中国移动签到, enabled=true

[MITM]
hostname = %APPEND% wx.10086.cn
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

  envCheck: function (cookieValid, tokenStatus) {
    console.log("📂 Environment");
    console.log("- Cookie : " + (cookieValid ? "Valid" : "Invalid"));
    console.log("- Token  : " + tokenStatus);
    console.log("------------------------------------");
  },

  accountHeader: function (index, domain) {
    console.log("👤 Account | " + domain);
  },

  field: function (label, value) {
    var padding = "              ";
    var key = (label + padding).substring(0, 14);
    console.log(key + ": " + value);
  },

  status: function (icon, text) { this.field("Status", icon + " " + text); },
  points: function (val) { this.field("Points", val); },
  action: function (val) { this.field("Action", val); },
  message: function (val) { this.field("Message", val); },

  separator: function () { console.log("------------------------------------"); },

  summary: function (total, success, duplicate, failed, result) {
    console.log("📊 Summary");
    console.log("Total      : " + total);
    console.log("Success    : " + success);
    console.log("Duplicate  : " + duplicate);
    console.log("Failed     : " + failed);
    console.log("🎯 Result  : " + result);
    console.log("End");
  }
};

// ========== 工具函数 ==========
var SCRIPT_NAME = "CMCC";
var SCRIPT_VERSION = "v1.2.0";
var COOKIE_KEY = "CMCC_Cookie";
var HOST = "wx.10086.cn";
var BASE_URL = "https://wx.10086.cn/qwhdhub/api/mark/mark31";
var REFERER = "https://wx.10086.cn/qwhdhub/qwhdmark/1021122301?channelId=P00000109876";
var USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148/wkwebview leadeon/12.0.6/CMCCIT";
var isGetHeader = typeof $request !== "undefined";

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

function getPlatform() {
  if (isQX) return "Quantumult X";
  if (isLoon) return "Loon";
  if (isSurge) return "Surge";
  return "Unknown";
}

function getDateString() {
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
}

function getStoredCookie() {
  try {
    var cookie = $store.read(COOKIE_KEY);
    return cookie ? String(cookie).trim() : "";
  } catch (e) { return ""; }
}

function saveCookie(cookie) {
  try {
    if (!cookie || !cookie.includes("QWHD_SESSION_TOKEN")) return false;
    var oldCookie = getStoredCookie();
    if (oldCookie !== cookie) {
      $store.write(cookie, COOKIE_KEY);
      return true;
    }
    return false;
  } catch (e) { return false; }
}

function fetchUrl(url, options) {
  var opts = {
    url: url,
    method: (options && options.method) || "GET",
    headers: (options && options.headers) || {}
  };
  if (options && options.body) opts.body = options.body;
  return $http.fetch(opts).then(function (resp) { return resp.body || ""; });
}

function makeHeaders(cookie) {
  return {
    Host: HOST, Accept: "*/*", "Content-Type": "application/json;charset=UTF-8",
    Origin: "https://" + HOST, Referer: REFERER, "login-check": "1",
    "x-requested-with": "XMLHttpRequest", "User-Agent": USER_AGENT, Cookie: cookie
  };
}

// ========== 主流程 ==========
if (isGetHeader) {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Manual");

  var allHeaders = $request.headers || {};
  var cookie = allHeaders.Cookie || allHeaders.cookie || "";

  if (!cookie) {
    Logger.status("⚠️", "Cookie 未获取到");
    notifyFn("中国移动", "抓包失败", "未获取到 Cookie");
  } else {
    var saved = saveCookie(cookie);
    Logger.status("✅", saved ? "Cookie 已更新" : "Cookie 未变化");
    if (saved) notifyFn("中国移动", "Cookie 已更新", "后续将用于自动签到领奖");
  }
  $done({});
} else {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Cron");

  var storedCookie = getStoredCookie();
  if (!storedCookie) {
    Logger.envCheck(false, "Missing");
    Logger.status("⚠️", "无 Cookie");
    notifyFn("中国移动签到", "", "状态：失败\n原因：未获取到 Cookie");
    $done();
  } else {
    Logger.envCheck(true, "Found");
    Logger.accountHeader(null, HOST);

    var headers = makeHeaders(storedCookie);
    var today = getDateString();
    Logger.action("签到: " + today);

    fetchUrl(BASE_URL + "/domark", {
      method: "POST", headers: headers, body: JSON.stringify({ date: today })
    }).then(function (signInResp) {
      var signInData = safeJsonParse(signInResp);
      if (!signInData) {
        Logger.status("❌", "响应解析错误");
        Logger.summary(1, 0, 0, 1, "响应解析错误");
        notifyFn("中国移动签到", "", "状态：失败\n原因：响应解析错误");
        $done();
        return;
      }

      if (!signInData.success && signInData.code !== "SUCCESS") {
        Logger.status("❌", signInData.msg || signInData.code);
        Logger.summary(1, 0, 0, 1, signInData.msg || "签到失败");
        notifyFn("中国移动签到", "", "状态：失败\n原因：" + (signInData.msg || signInData.code));
        $done();
        return;
      }

      var awards = (signInData.data && signInData.data.taskAwardChance) || [];

      if (awards.length > 0) {
        var awardId = awards[0].id;
        Logger.action("领取奖励 ID: " + awardId);

        fetchUrl(BASE_URL + "/taskAward/" + awardId, {
          method: "POST", headers: headers, body: "{}"
        }).then(function (awardResp) {
          var awardData = safeJsonParse(awardResp);
          if (awardData && awardData.success) {
            var prize = (awardData.data && awardData.data.prizeName) || "奖励已领取";
            Logger.status("✅", "签到+领奖成功");
            Logger.points(prize);
            Logger.separator();
            Logger.summary(1, 1, 0, 0, "签到+领奖成功");
            notifyFn("中国移动签到", "", "状态：成功\n奖励：" + prize);
          } else {
            Logger.status("✅", "签到成功，领奖失败");
            Logger.separator();
            Logger.summary(1, 1, 0, 0, "签到成功");
            notifyFn("中国移动签到", "", "状态：成功（领奖失败）");
          }
          $done();
        });
      } else {
        Logger.status("✅", "签到成功");
        Logger.action("无可领取奖励");
        Logger.separator();
        Logger.summary(1, 1, 0, 0, "签到成功");
        notifyFn("中国移动签到", "", "状态：成功\n" + (signInData.msg || "已签到"));
        $done();
      }
    }).catch(function (e) {
      Logger.status("❌", "网络错误");
      Logger.summary(1, 0, 0, 1, "网络错误");
      notifyFn("中国移动签到", "", "状态：失败\n原因：网络错误");
      $done();
    });
  }
}
