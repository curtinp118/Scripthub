/******************************
脚本功能：中国移动 自动签到领奖
Version  : v1.1.0
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
  info: function (msg) { console.log("ℹ️ INFO    │ " + msg); },
  success: function (msg) { console.log("✅ SUCCESS │ " + msg); },
  warn: function (msg) { console.log("⚠️ WARN    │ " + msg); },
  error: function (msg) { console.log("❌ ERROR   │ " + msg); },
  debug: function (msg) { console.log("🐛 DEBUG   │ " + msg); },

  scriptStart: function (name, version) {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var time = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    console.log("🚀 [" + name + "] Script Start");
    console.log("📅 Time: " + time);
    console.log("📦 Version: " + version);
  },

  envCheck: function (platform, requestType, notifyEnabled, proxyEnabled) {
    console.log("🔍 Environment Check");
    console.log("Platform   : " + platform);
    console.log("Request    : " + requestType);
    console.log("Notify     : " + (notifyEnabled ? "Enabled" : "Disabled"));
    console.log("Proxy      : " + (proxyEnabled === null ? "N/A" : (proxyEnabled ? "Enabled" : "Disabled")));
    console.log("");
    console.log("✅ Environment Ready");
  },

  configLoading: function (cookieValid, tokenStatus, accountCount) {
    console.log("📂 Config Loading");
    var cookieIcon = cookieValid === true ? "Valid ✅" : cookieValid === false ? "Invalid ❌" : "Missing ⚠️";
    console.log("Cookie Status  : " + cookieIcon);
    console.log("Token Status   : " + tokenStatus);
    console.log("Account Count  : " + accountCount);
    console.log("");
    console.log("✅ Config Ready");
  },

  accountHeader: function (index, domain) {
    console.log("━━━━━━━━━━━━━━━━━━");
    if (index !== undefined && index !== null) {
      console.log("👤 Account #" + index);
    } else {
      console.log("👤 Account");
    }
    if (domain) console.log("🌐 Domain : " + domain);
    console.log("━━━━━━━━━━━━━━━━━━");
  },

  status: function (icon, text) { console.log("📊 Status   : " + icon + " " + text); },
  points: function (val) { console.log("🎯 Points   : " + val); },

  taskSummary: function (total, success, duplicate, failed) {
    console.log("📋 Task Summary");
    console.log("");
    console.log("Total     : " + total);
    console.log("Success   : " + success);
    console.log("Duplicate : " + duplicate);
    console.log("Failed    : " + failed);
  },

  scriptFinished: function () { console.log("✅ Script Finished"); }
};

// ========== 工具函数 ==========
var SCRIPT_NAME = "CMCC";
var SCRIPT_VERSION = "v1.1.0";
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

// ========== 存储函数 ==========
function getStoredCookie() {
  try {
    var cookie = $store.read(COOKIE_KEY);
    return cookie ? String(cookie).trim() : "";
  } catch (e) {
    Logger.error("读取Cookie失败: " + e);
    return "";
  }
}

function saveCookie(cookie) {
  try {
    if (!cookie || !cookie.includes("QWHD_SESSION_TOKEN")) return false;
    var oldCookie = getStoredCookie();
    if (oldCookie !== cookie) {
      $store.write(cookie, COOKIE_KEY);
      Logger.success("Cookie 已更新");
      return true;
    }
    return false;
  } catch (e) {
    Logger.error("保存Cookie失败: " + e);
    return false;
  }
}

// ========== 网络请求 ==========
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
    Host: HOST,
    Accept: "*/*",
    "Content-Type": "application/json;charset=UTF-8",
    Origin: "https://" + HOST,
    Referer: REFERER,
    "login-check": "1",
    "x-requested-with": "XMLHttpRequest",
    "User-Agent": USER_AGENT,
    Cookie: cookie
  };
}

// ========== 主流程 ==========
if (isGetHeader) {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION);

  var allHeaders = $request.headers || {};
  var cookie = allHeaders.Cookie || allHeaders.cookie || "";

  if (!cookie) {
    Logger.error("Cookie 未获取到");
  } else {
    var saved = saveCookie(cookie);
    if (saved) {
      Logger.success("Cookie 已捕获");
      notifyFn("中国移动", "Cookie 已更新", "后续将用于自动签到领奖");
    }
  }
  Logger.scriptFinished();
  $done({});
} else {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION);
  Logger.envCheck(getPlatform(), "Cron", true, null);

  var storedCookie = getStoredCookie();
  if (!storedCookie) {
    Logger.configLoading(false, "Missing", 0);
    Logger.error("未找到 Cookie");
    notifyFn("中国移动", "未获取到 Cookie", "请先打开移动 App 进入签到页面");
    Logger.scriptFinished();
    $done();
  } else {
    Logger.configLoading(true, "Found", 1);
    Logger.accountHeader(null, HOST);

    var headers = makeHeaders(storedCookie);
    var today = getDateString();

    Logger.info("执行签到: " + today);

    fetchUrl(BASE_URL + "/domark", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ date: today })
    }).then(function (signInResp) {
      var signInData = safeJsonParse(signInResp);
      if (!signInData) {
        Logger.status("❌", "响应解析错误");
        Logger.taskSummary(1, 0, 0, 1);
        notifyFn("中国移动签到失败", "响应解析错误", "");
        Logger.scriptFinished();
        $done();
        return;
      }

      if (!signInData.success && signInData.code !== "SUCCESS") {
        Logger.status("❌", signInData.msg || signInData.code);
        Logger.taskSummary(1, 0, 0, 1);
        notifyFn("中国移动签到失败", signInData.msg || signInData.code || "", "");
        Logger.scriptFinished();
        $done();
        return;
      }

      var awards = (signInData.data && signInData.data.taskAwardChance) || [];

      if (awards.length > 0) {
        var awardId = awards[0].id;
        Logger.info("发现奖励，领取中... ID: " + awardId);

        fetchUrl(BASE_URL + "/taskAward/" + awardId, {
          method: "POST",
          headers: headers,
          body: "{}"
        }).then(function (awardResp) {
          var awardData = safeJsonParse(awardResp);
          if (awardData && awardData.success) {
            var prize = (awardData.data && awardData.data.prizeName) || "奖励已领取";
            Logger.status("✅", "签到+领奖成功");
            Logger.points(prize);
            Logger.taskSummary(1, 1, 0, 0);
            notifyFn("中国移动签到+领奖成功", "", prize);
          } else {
            Logger.status("✅", "签到成功，领奖失败");
            Logger.taskSummary(1, 1, 0, 0);
            notifyFn("中国移动签到成功", "领奖失败", "");
          }
          Logger.scriptFinished();
          $done();
        });
      } else {
        Logger.status("✅", "签到成功 | 无可领取奖励");
        Logger.taskSummary(1, 1, 0, 0);
        notifyFn("中国移动签到成功", "", signInData.msg || "已签到");
        Logger.scriptFinished();
        $done();
      }
    }).catch(function (e) {
      var errMsg = e && e.error ? String(e.error) : String(e && e.message ? e.message : e || "Unknown error");
      Logger.status("❌", "网络错误: " + errMsg);
      Logger.taskSummary(1, 0, 0, 1);
      notifyFn("中国移动网络错误", "", errMsg);
      Logger.scriptFinished();
      $done();
    });
  }
}