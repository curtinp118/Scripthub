/****************************** 
脚本功能：GLaDOS / Railgun 自动签到 + 积分兑换（多账号版）
Version  : v1.1.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
  访问 GLaDOS 任意域名的 /console/account 页面抓包保存 Cookie，定时任务自动对已保存 Cookie 的域名执行签到。
  支持 glados.network、railgun.info、glados.vip、glados.one、glados.space，各域名支持多账号。
  同一域名多次抓包可保存不同账号的 Cookie。

[rewrite_local]
^https:\/\/glados\.network\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https:\/\/railgun\.info\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https:\/\/glados\.vip\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https:\/\/glados\.one\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https:\/\/glados\.space\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js

[task_local]
10 7 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, tag=GLaDOS 签到, enabled=true, img-url=https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/apps/GlaDos.png

[MITM]
hostname = %APPEND% glados.network, railgun.info, glados.vip, glados.one, glados.space

Loon:
[Script]
http-request ^https://glados\.network/console/account$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, requires-body=false, tag=GLaDOS 抓包
http-request ^https://railgun\.info/console/account$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, requires-body=false, tag=GLaDOS 抓包
http-request ^https://glados\.vip/console/account$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, requires-body=false, tag=GLaDOS 抓包
http-request ^https://glados\.one/console/account$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, requires-body=false, tag=GLaDOS 抓包
http-request ^https://glados\.space/console/account$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, requires-body=false, tag=GLaDOS 抓包
cron "10 7 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, tag=GLaDOS 签到, enabled=true

[MITM]
hostname = glados.network, railgun.info, glados.vip, glados.one, glados.space

Surge:
[Script]
GLaDOS 抓包 = type=http-request, pattern=^https://glados\.network/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 抓包2 = type=http-request, pattern=^https://railgun\.info/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 抓包3 = type=http-request, pattern=^https://glados\.vip/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 抓包4 = type=http-request, pattern=^https://glados\.one/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 抓包5 = type=http-request, pattern=^https://glados\.space/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 签到 = type=cron, cronexp="10 7 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, timeout=60

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
  info: function (msg) { console.log("ℹ️ INFO    │ " + msg); },
  success: function (msg) { console.log("✅ SUCCESS │ " + msg); },
  warn: function (msg) { console.log("⚠️ WARN    │ " + msg); },
  error: function (msg) { console.log("❌ ERROR   │ " + msg); },

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
  balance: function (val) { console.log("💰 Balance  : " + val); },
  streak: function (val) { console.log("🔥 Streak   : " + val); },

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
var SCRIPT_NAME = "GLaDOS";
var SCRIPT_VERSION = "v1.1.0";
var COOKIES_KEY_PREFIX = "GLaDOS_Cookies";
var DOMAINS_LIST_KEY = "GLaDOS_Domains";
var DOMAINS = ["glados.network", "railgun.info", "glados.vip", "glados.one", "glados.space"];
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
  } catch (e) {
    Logger.error("读取域名列表失败: " + e);
    return [];
  }
}

function addDomain(domain) {
  try {
    var list = getSavedDomains();
    if (list.indexOf(domain) === -1) {
      list.push(domain);
      $store.write(JSON.stringify(list), DOMAINS_LIST_KEY);
    }
  } catch (e) {
    Logger.error("保存域名失败: " + e);
  }
}

function getCookiesForDomain(domain) {
  try {
    var raw = $store.read(cookiesKeyFor(domain));
    if (!raw) return [];
    var list = safeJsonParse(raw);
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch (e) {
    Logger.error("读取Cookie失败: " + e);
    return [];
  }
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
  } catch (e) {
    Logger.error("保存Cookie失败: " + e);
    return { isNew: false, index: -1 };
  }
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
  var url = "https://" + domain + "/api/user/checkin";
  return request(url, "POST", cookie, domain, { token: domain }).then(function (resp) {
    if (resp.error) {
      Logger.error("签到网络错误 [" + domain + "]: " + resp.error);
      return { status: "签到失败", code: -2, message: resp.error, points: "0" };
    }
    if (!resp.data) {
      Logger.error("签到响应解析失败 [" + domain + "]: " + resp.raw);
      return { status: "签到失败", code: -2, message: resp.raw, points: "0" };
    }
    var data = resp.data;
    var code = data.code !== undefined ? data.code : -2;
    var message = data.message || "";
    var points = String(data.points !== undefined ? data.points : 0);
    if (code === 0) {
      Logger.success("签到成功 [" + domain + "]: +" + points + " 积分, " + message);
      return { status: "签到成功", code: 0, message: message, points: points };
    } else if (code === 1) {
      Logger.warn("重复签到 [" + domain + "]: " + message);
      return { status: "重复签到", code: 1, message: message, points: "0" };
    } else {
      Logger.error("签到失败 [" + domain + "]: code=" + code + ", " + message);
      return { status: "签到失败", code: code, message: message, points: "0" };
    }
  });
}

function getStatus(cookie, domain) {
  return request("https://" + domain + "/api/user/status", "GET", cookie, domain).then(function (resp) {
    if (resp.error || !resp.data) {
      Logger.error("查询状态失败 [" + domain + "]: " + (resp.error || resp.raw));
      return { leftDays: "N/A" };
    }
    var leftDays = resp.data.data && resp.data.data.leftDays;
    if (leftDays !== undefined && leftDays !== null) {
      var days = parseInt(parseFloat(leftDays), 10);
      Logger.info("剩余天数 [" + domain + "]: " + days + " 天");
      return { leftDays: days + " 天" };
    }
    return { leftDays: "N/A" };
  });
}

function getPoints(cookie, domain) {
  return request("https://" + domain + "/api/user/points", "GET", cookie, domain).then(function (resp) {
    if (resp.error || !resp.data) {
      Logger.error("查询积分失败 [" + domain + "]: " + (resp.error || resp.raw));
      return { points: "N/A", pointsNum: 0 };
    }
    var points = resp.data.points;
    if (points !== undefined && points !== null) {
      var pointsInt = parseInt(parseFloat(points), 10);
      Logger.info("总积分 [" + domain + "]: " + pointsInt);
      return { points: "" + pointsInt, pointsNum: pointsInt };
    }
    return { points: "N/A", pointsNum: 0 };
  });
}

function exchange(cookie, domain, plan) {
  return request("https://" + domain + "/api/user/exchange", "POST", cookie, domain, { planType: plan }).then(function (resp) {
    if (resp.error || !resp.data) {
      Logger.error("兑换失败 [" + domain + "]: " + (resp.error || resp.raw));
      return "兑换失败: " + (resp.error || resp.raw);
    }
    var code = resp.data.code !== undefined ? resp.data.code : -2;
    var message = resp.data.message || "";
    if (code === 0) {
      Logger.success("兑换成功 [" + domain + "]: " + plan + ", " + message);
      return "兑换成功(" + plan + ")";
    } else {
      Logger.error("兑换失败 [" + domain + "]: code=" + code + ", " + message);
      return "兑换失败: " + message;
    }
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
    } else {
      Logger.info("积分 " + pointsResult.pointsNum + " < 500，跳过兑换");
      return "跳过(积分不足)";
    }
  }).then(function (er) {
    if (er) exchangeResult = er;
    return getStatus(cookie, domain);
  }).then(function (sa) {
    statusAfter = sa;

    var icon = checkinResult.code === 0 ? "✅" : checkinResult.code === 1 ? "🔄" : "❌";
    Logger.status(icon, checkinResult.status);
    if (checkinResult.points !== "0") Logger.points("+" + checkinResult.points);
    Logger.balance(statusBefore.leftDays + " → " + statusAfter.leftDays);
    Logger.info("积分余额: " + pointsResult.points + " | 兑换: " + exchangeResult);

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
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION);

  var allHeaders = $request.headers || {};
  var cookie = allHeaders.Cookie || allHeaders.cookie || "";
  var host = getHostFromRequest();

  if (!cookie || !host) {
    Logger.error("Cookie 或 Host 未获取到");
    notifyFn("GLaDOS", "抓包失败", "未获取到 Cookie 或 Host，请检查重写配置");
    $done({});
  } else {
    var result = saveCookie(host, cookie);
    var label = "账号 #" + (result.index + 1);
    if (result.isNew) {
      Logger.success(label + " Cookie 已保存 [" + host + "]");
      notifyFn("GLaDOS", label + " 已保存 [" + host + "]", "新账号 Cookie 已记录，将用于自动签到");
    } else {
      Logger.info(label + " Cookie 已存在 [" + host + "]");
      notifyFn("GLaDOS", label + " 已存在 [" + host + "]", "该 Cookie 已保存过，无需重复抓包");
    }
    Logger.scriptFinished();
    $done({});
  }
} else {
  var delay = Math.floor(Math.random() * 11);
  Logger.info("随机延迟 " + delay + "s");

  setTimeout(function () {
    Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION);
    Logger.envCheck(getPlatform(), "Cron", true, null);

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
      Logger.configLoading(false, "Missing", 0);
      Logger.warn("未找到已保存的 Cookie");
      notifyFn("GLaDOS 签到", "无 Cookie", "请先访问 /console/account 抓包");
      Logger.scriptFinished();
      return $done();
    }

    Logger.configLoading(true, "Found", totalAccounts);

    var allResults = [];
    var idx = 0;

    function next() {
      if (idx >= allCookies.length) {
        var ok = allResults.filter(function (r) { return r.code === 0; }).length;
        var dup = allResults.filter(function (r) { return r.code === 1; }).length;
        var fail = allResults.filter(function (r) { return r.code !== 0 && r.code !== 1; }).length;

        Logger.taskSummary(totalAccounts, ok, dup, fail);

        var lines = allResults.map(function (r) {
          var icon = r.code === 0 ? "✅" : r.code === 1 ? "🔄" : "❌";
          var pts = r.earnedPoints !== "0" ? " +" + r.earnedPoints : "";
          return icon + " 账号#" + r.accountIndex + " " + r.domain + " | " + r.status + pts + " | " + r.daysBefore + "→" + r.daysAfter + " | " + r.totalPoints + "积分";
        });

        var title = "GLaDOS | " + totalAccounts + "账号 成" + ok + " 重" + dup + " 败" + fail;
        notifyFn(title, "", lines.join("\n"));
        Logger.scriptFinished();
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
