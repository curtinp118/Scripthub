/****************************** 
脚本功能：GLaDOS / Railgun 自动签到 + 积分兑换（多账号版）
Version  : v1.2.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
访问 GLaDOS 任意域名的 /console/account 页面抓包保存 Cookie，定时任务自动签到。
支持 glados.network、railgun.info、glados.vip、glados.one、glados.space，各域名支持多账号。

[rewrite_local]
^https://glados\.network/console/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https://railgun\.info/console/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https://glados\.vip/console/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https://glados\.one/console/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https://glados\.space/console/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js

[task_local]
10 7 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, tag=GLaDOS 签到, enabled=true

[MITM]
hostname = %APPEND% glados.network, railgun.info, glados.vip, glados.one, glados.space
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
    if (index !== undefined && index !== null) {
      console.log("👤 Account #" + index + " | " + domain);
    } else {
      console.log("👤 Account | " + domain);
    }
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
var SCRIPT_NAME = "GLaDOS";
var SCRIPT_VERSION = "v1.2.0";
var COOKIES_KEY_PREFIX = "GLaDOS_Cookies";
var DOMAINS_LIST_KEY = "GLaDOS_Domains";
var EXCHANGE_PLAN = "plan500";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
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

// ========== 存储函数 ==========
function cookiesKeyFor(domain) {
  return COOKIES_KEY_PREFIX + ":" + domain;
}

function getSavedDomains() {
  try {
    var raw = $store.read(DOMAINS_LIST_KEY);
    if (!raw) return [];
    var list = safeJsonParse(raw) || [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch (e) { return []; }
}

function addDomain(domain) {
  try {
    var list = getSavedDomains();
    if (list.indexOf(domain) === -1) {
      list.push(domain);
      $store.write(JSON.stringify(list), DOMAINS_LIST_KEY);
    }
  } catch (e) {}
}

function getCookiesForDomain(domain) {
  try {
    var raw = $store.read(cookiesKeyFor(domain));
    if (!raw) return [];
    var list = safeJsonParse(raw);
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch (e) { return []; }
}

function saveCookie(domain, cookie) {
  try {
    if (!cookie) return { isNew: false, index: -1 };
    var cookies = getCookiesForDomain(domain);
    var existingIdx = cookies.indexOf(cookie);
    if (existingIdx !== -1) return { isNew: false, index: existingIdx };
    cookies.push(cookie);
    $store.write(JSON.stringify(cookies), cookiesKeyFor(domain));
    addDomain(domain);
    return { isNew: true, index: cookies.length - 1 };
  } catch (e) { return { isNew: false, index: -1 }; }
}

function getHostFromRequest() {
  var h = ($request && $request.headers) || {};
  if (h.Host || h.host) return h.Host || h.host;
  var url = ($request && $request.url) || "";
  var m = url.match(/^https?:\/\/([^/]+)/);
  return m ? m[1] : "";
}

// ========== 网络请求 ==========
function request(url, method, cookie, domain, body) {
  var headers = {
    "Content-Type": "application/json;charset=UTF-8",
    "Origin": "https://" + domain,
    "Referer": "https://" + domain + "/console/current",
    "User-Agent": UA,
    "Cookie": cookie
  };
  var opts = { url: url, method: method, headers: headers };
  if (body !== undefined) opts.body = typeof body === "string" ? body : JSON.stringify(body);

  return $http.fetch(opts).then(
    function (resp) {
      return { statusCode: resp.statusCode, data: safeJsonParse(resp.body || ""), raw: resp.body || "" };
    },
    function (reason) {
      return { statusCode: 0, data: null, raw: "", error: reason ? String(reason) : "Network error" };
    }
  );
}

// ========== API ==========
function checkin(cookie, domain) {
  return request("https://" + domain + "/api/user/checkin", "POST", cookie, domain, { token: domain }).then(function (resp) {
    if (resp.error) return { status: "签到失败", code: -2, message: resp.error, points: "0" };
    if (!resp.data) return { status: "签到失败", code: -2, message: resp.raw, points: "0" };
    var data = resp.data;
    var code = data.code !== undefined ? data.code : -2;
    var message = data.message || "";
    var points = String(data.points !== undefined ? data.points : 0);
    if (code === 0) return { status: "签到成功", code: 0, message: message, points: points };
    if (code === 1) return { status: "重复签到", code: 1, message: message, points: "0" };
    return { status: "签到失败", code: code, message: message, points: "0" };
  });
}

function getStatus(cookie, domain) {
  return request("https://" + domain + "/api/user/status", "GET", cookie, domain).then(function (resp) {
    if (resp.error || !resp.data) return { leftDays: "N/A" };
    var leftDays = resp.data.data && resp.data.data.leftDays;
    if (leftDays !== undefined && leftDays !== null) {
      return { leftDays: parseInt(parseFloat(leftDays), 10) + " 天" };
    }
    return { leftDays: "N/A" };
  });
}

function getPoints(cookie, domain) {
  return request("https://" + domain + "/api/user/points", "GET", cookie, domain).then(function (resp) {
    if (resp.error || !resp.data) return { points: "N/A", pointsNum: 0 };
    var points = resp.data.points;
    if (points !== undefined && points !== null) {
      var pointsInt = parseInt(parseFloat(points), 10);
      return { points: "" + pointsInt, pointsNum: pointsInt };
    }
    return { points: "N/A", pointsNum: 0 };
  });
}

function exchange(cookie, domain, plan) {
  return request("https://" + domain + "/api/user/exchange", "POST", cookie, domain, { planType: plan }).then(function (resp) {
    if (resp.error || !resp.data) return "兑换失败";
    var code = resp.data.code !== undefined ? resp.data.code : -2;
    var message = resp.data.message || "";
    if (code === 0) return "兑换成功(" + plan + ")";
    return "兑换失败: " + message;
  });
}

function checkinForAccount(cookie, domain, accountIndex) {
  Logger.accountHeader(accountIndex, domain);

  var statusBefore, checkinResult, pointsResult, exchangeResult, statusAfter;

  return getStatus(cookie, domain).then(function (sb) {
    statusBefore = sb;
    return checkin(cookie, domain);
  }).then(function (cr) {
    checkinResult = cr;
    return getPoints(cookie, domain);
  }).then(function (pr) {
    pointsResult = pr;
    exchangeResult = "跳过(积分不足)";
    if (pointsResult.pointsNum >= 500) {
      return exchange(cookie, domain, EXCHANGE_PLAN);
    }
    return "跳过(积分不足)";
  }).then(function (er) {
    if (er) exchangeResult = er;
    return getStatus(cookie, domain);
  }).then(function (sa) {
    statusAfter = sa;

    var icon = checkinResult.code === 0 ? "✅" : checkinResult.code === 1 ? "🔁" : "❌";
    Logger.status(icon, checkinResult.status);
    if (checkinResult.points !== "0") Logger.points("+" + checkinResult.points);
    Logger.daysLeft(statusBefore.leftDays + " → " + statusAfter.leftDays);
    Logger.balance(pointsResult.points);
    Logger.action("兑换: " + exchangeResult);
    if (checkinResult.message) Logger.message(checkinResult.message);
    Logger.separator();

    return {
      accountIndex: accountIndex,
      domain: domain,
      status: checkinResult.status,
      code: checkinResult.code,
      message: checkinResult.message,
      earnedPoints: checkinResult.points,
      totalPoints: pointsResult.points,
      daysBefore: statusBefore.leftDays,
      daysAfter: statusAfter.leftDays,
      exchange: exchangeResult
    };
  });
}

// ========== 主流程 ==========
if (isGetHeader) {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Manual");

  var allHeaders = $request.headers || {};
  var cookie = allHeaders.Cookie || allHeaders.cookie || "";
  var host = getHostFromRequest();

  if (!cookie || !host) {
    Logger.status("⚠️", "抓包失败");
    Logger.message("未获取到 Cookie 或 Host");
    notifyFn("GLaDOS 抓包失败", "", "未获取到 Cookie 或 Host");
    $done({});
  } else {
    var result = saveCookie(host, cookie);
    var label = "账号 #" + (result.index + 1);
    Logger.status("✅", result.isNew ? "新账号已保存" : "已存在");
    Logger.field("Account", label);
    Logger.field("Domain", host);
    notifyFn("GLaDOS 抓包", result.isNew ? "新账号已保存" : "已存在", label + " | " + host);
    $done({});
  }
} else {
  var delay = Math.floor(Math.random() * 11);

  setTimeout(function () {
    Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Cron");

    var savedDomains = getSavedDomains();
    var allCookies = [];
    for (var d = 0; d < savedDomains.length; d++) {
      var cookies = getCookiesForDomain(savedDomains[d]);
      for (var c = 0; c < cookies.length; c++) {
        allCookies.push({ domain: savedDomains[d], cookie: cookies[c] });
      }
    }

    var totalAccounts = allCookies.length;
    if (totalAccounts === 0) {
      Logger.envCheck(false, "Missing");
      Logger.status("⚠️", "无 Cookie");
      notifyFn("GLaDOS 签到", "无 Cookie", "请先抓包");
      $done();
      return;
    }

    Logger.envCheck(true, "Found (" + totalAccounts + ")");

    var allResults = [];
    var idx = 0;

    function next() {
      if (idx >= allCookies.length) {
        var ok = allResults.filter(function (r) { return r.code === 0; }).length;
        var dup = allResults.filter(function (r) { return r.code === 1; }).length;
        var fail = allResults.filter(function (r) { return r.code !== 0 && r.code !== 1; }).length;

        var resultText = "成功" + ok + " 重复" + dup + " 失败" + fail;
        Logger.summary(totalAccounts, ok, dup, fail, resultText);

        // 构建通知摘要
        var notifyLines = ["【GLaDOS】执行结果"];
        notifyLines.push("状态：" + (fail === 0 ? "全部成功" : "部分失败"));
        notifyLines.push("账号：" + totalAccounts + " | 成功：" + ok + " 重复：" + dup + " 失败：" + fail);
        notifyLines.push("---");
        for (var r = 0; r < allResults.length; r++) {
          var res = allResults[r];
          var icon = res.code === 0 ? "✅" : res.code === 1 ? "🔁" : "❌";
          var pts = res.earnedPoints !== "0" ? " +" + res.earnedPoints + "积分" : "";
          notifyLines.push(icon + " #" + res.accountIndex + " " + res.domain);
          notifyLines.push("  " + res.status + pts + " | 剩余 " + res.daysAfter);
        }
        notifyFn("GLaDOS 签到结果", "", notifyLines.join("\n"));
        $done();
        return;
      }

      var item = allCookies[idx];
      idx++;
      checkinForAccount(item.cookie, item.domain, idx).then(function (result) {
        allResults.push(result);
        next();
      });
    }

    next();
  }, delay * 1000);
}
