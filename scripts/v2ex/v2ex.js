/****************************** 
脚本功能：V2EX 每日签到
Version  : v1.2.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
访问 V2EX 个人主页保存 Cookie，定时任务自动签到领取铜币。

[rewrite_local]
^https://www\.v2ex\.com/(mission|member).* url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, tag=V2EX 每日签到, enabled=true

[MITM]
hostname = %APPEND% www.v2ex.com
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
  daysLeft: function (val) { this.field("Days left", val); },
  balance: function (val) { this.field("Balance", val); },
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
var SCRIPT_NAME = "V2EX";
var SCRIPT_VERSION = "v1.2.0";
var COOKIE_KEY = "V2EX_Cookie";
var HOST = "www.v2ex.com";
var isGetHeader = typeof $request !== "undefined";

var COMMON_HEADERS = {
  "Accept": "*/*",
  "Accept-Language": "en,zh-CN;q=0.9,zh;q=0.8",
  "cache-control": "max-age=0",
  "pragma": "no-cache",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://www.v2ex.com/"
};

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

function getPlatform() {
  if (isQX) return "Quantumult X";
  if (isLoon) return "Loon";
  if (isSurge) return "Surge";
  return "Unknown";
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// ========== 存储函数 ==========
function getStoredCookie() {
  try {
    var cookie = $store.read(COOKIE_KEY);
    return cookie ? String(cookie).trim() : "";
  } catch (e) { return ""; }
}

function saveCookie(cookie) {
  try {
    if (!cookie) return false;
    var oldCookie = getStoredCookie();
    if (oldCookie !== cookie) {
      $store.write(cookie, COOKIE_KEY);
      return true;
    }
    return false;
  } catch (e) { return false; }
}

function buildHeaders(cookie) {
  var h = {};
  for (var k in COMMON_HEADERS) { h[k] = COMMON_HEADERS[k]; }
  h["Cookie"] = cookie;
  return h;
}

// ========== 网络请求 ==========
function fetchUrl(url, headers) {
  return $http.fetch({ url: url, headers: headers, method: "GET" }).then(function (resp) {
    return resp.body || "";
  });
}

function formatBalance(html) {
  try {
    if (!html) return "";
    var parts = [];
    var balanceBlock = html.match(/balance_area bigger[\s\S]*?<\/div>/);
    if (!balanceBlock) return "";
    var block = balanceBlock[0];
    var re = /(\d+)\s+<img[^>]+alt="([A-Z])"/g;
    var m;
    while ((m = re.exec(block)) !== null) {
      var num = m[1];
      var type = m[2];
      if (type === "G") parts.push(num + " 金币");
      if (type === "S") parts.push(num + " 银币");
      if (type === "B") parts.push(num + " 铜币");
    }
    return parts.join(", ") || "";
  } catch (e) { return ""; }
}

function getOnce(headers) {
  return fetchUrl("https://www.v2ex.com/mission/daily", headers).then(function (html) {
    if (!html) return { once: "", logged_in: false, already: false, days: "?" };
    if (html.includes("你要查看的页面需要先登录") || html.includes("需要先登录")) {
      return { once: "", logged_in: false, already: false, days: "?" };
    }
    var daysMatch = html.match(/已连续登录\s*(\d+)\s*天/);
    var days = daysMatch ? daysMatch[1] : "?";
    if (html.includes("每日登录奖励已领取")) {
      return { once: "", logged_in: true, already: true, days: days };
    }
    var onceMatch = html.match(/once=(\d+)/);
    return { once: onceMatch ? onceMatch[1] : "", logged_in: true, already: false, days: days };
  });
}

function queryBalance(headers) {
  return fetchUrl("https://www.v2ex.com/balance", headers).then(function (html) {
    return { balance: formatBalance(html) };
  });
}

function checkIn(once, headers) {
  return fetchUrl("https://www.v2ex.com/mission/daily/redeem?once=" + once, headers);
}

function doCheckin(attempt, maxRetry, headers) {
  Logger.action("签到尝试 " + (attempt + 1) + "/" + maxRetry);

  return getOnce(headers).then(function (info) {
    if (!info.logged_in) {
      Logger.status("❌", "Cookie 已失效");
      Logger.summary(1, 0, 0, 1, "Cookie 已失效，请重新获取");
      notifyFn("V2EX 签到结果", "", "状态：失败\n原因：Cookie 已失效\n请重新访问 V2EX 个人主页");
      $done({});
      return;
    }

    if (info.already) {
      return queryBalance(headers).then(function (q) {
        Logger.accountHeader(null, HOST);
        Logger.status("🔁", "今日已签到");
        Logger.daysLeft("连续 " + info.days + " 天");
        if (q.balance) Logger.balance(q.balance);
        Logger.separator();
        Logger.summary(1, 0, 1, 0, "今日已签到");
        notifyFn("V2EX 签到结果", "", "状态：重复签到\n连续签到：" + info.days + " 天" + (q.balance ? "\n余额：" + q.balance : ""));
        $done({});
      });
    }

    if (!info.once) {
      if (attempt + 1 < maxRetry) {
        return sleep(3000).then(function () { return doCheckin(attempt + 1, maxRetry, headers); });
      }
      Logger.summary(1, 0, 0, 1, "未找到 once 码");
      notifyFn("V2EX 签到结果", "", "状态：失败\n原因：未找到 once 码");
      $done({});
      return;
    }

    return checkIn(info.once, headers).then(function () {
      return queryBalance(headers);
    }).then(function (q) {
      Logger.accountHeader(null, HOST);
      Logger.status("✅", "签到成功");
      Logger.daysLeft("连续 " + info.days + " 天");
      if (q.balance) Logger.balance(q.balance);
      Logger.separator();
      Logger.summary(1, 1, 0, 0, "签到成功");
      notifyFn("V2EX 签到结果", "", "状态：成功\n连续签到：" + info.days + " 天" + (q.balance ? "\n余额：" + q.balance : ""));
      $done({});
    });
  }).catch(function (e) {
    if (attempt + 1 < maxRetry) {
      return sleep(3000).then(function () { return doCheckin(attempt + 1, maxRetry, headers); });
    }
    Logger.status("❌", "网络错误");
    Logger.summary(1, 0, 0, 1, "网络错误");
    notifyFn("V2EX 签到结果", "", "状态：失败\n原因：网络错误");
    $done({});
  });
}

// ========== 主流程 ==========
if (isGetHeader) {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Manual");

  var allHeaders = $request.headers || {};
  var cookie = allHeaders.Cookie || allHeaders.cookie || "";

  if (!cookie) {
    Logger.status("⚠️", "Cookie 未获取到");
    notifyFn("V2EX", "抓包失败", "未获取到 Cookie，请检查 MITM 配置");
  } else {
    var saved = saveCookie(cookie);
    Logger.status("✅", saved ? "Cookie 已更新" : "Cookie 未变化");
    if (saved) notifyFn("V2EX", "Cookie 已更新", "后续将用于自动签到");
  }
  $done({});
} else {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Cron");

  var storedCookie = getStoredCookie();
  if (!storedCookie) {
    Logger.envCheck(false, "Missing");
    Logger.status("⚠️", "无 Cookie");
    notifyFn("V2EX 签到", "", "状态：失败\n原因：未获取到 Cookie\n请先访问 V2EX 个人主页");
    $done({});
  } else {
    Logger.envCheck(true, "Found");
    var headers = buildHeaders(storedCookie);
    doCheckin(0, 3, headers);
  }
}
