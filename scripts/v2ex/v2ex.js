/******************************
脚本功能：V2EX 每日签到
更新时间：2026-05-30
作者：Curtinp118

使用说明：先访问 V2EX 个人主页保存 Cookie，再由定时任务自动签到。

[rewrite_local]
^https:\/\/www\.v2ex\.com\/(mission|member).* url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, tag=V2EX 每日签到, enabled=true

[MITM]
hostname = %APPEND% www.v2ex.com
*******************************/

var isQX = typeof $task !== "undefined";
var isLoon = typeof $loon !== "undefined";
var isSurge = typeof $httpClient !== "undefined" && !isLoon;

var $http = {
  fetch: function(opts) {
    if (isQX) return $task.fetch(opts);
    return new Promise(function(resolve, reject) {
      var method = (opts.method || "GET").toUpperCase();
      var handler = function(err, resp, data) {
        if (err) reject(err);
        else resolve({ statusCode: resp.statusCode, headers: resp.headers, body: data });
      };
      if (method === "POST") $httpClient.post(opts, handler);
      else $httpClient.get(opts, handler);
    });
  }
};

var $store = {
  read: function(key) { return isQX ? $prefs.valueForKey(key) : $persistentStore.read(key); },
  write: function(val, key) { return isQX ? $prefs.setValueForKey(val, key) : $persistentStore.write(val, key); }
};

var notify = isQX
  ? function(t, s, b) { $notify(t, s, b); }
  : function(t, s, b) { $notification.post(t, s, b); };

var COOKIE_KEY = "V2EX_Cookie";
var isGetHeader = typeof $request !== "undefined";

var COMMON_HEADERS = {
  "Accept": "*/*",
  "Accept-Language": "en,zh-CN;q=0.9,zh;q=0.8",
  "cache-control": "max-age=0",
  "pragma": "no-cache",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://www.v2ex.com/"
};

function getStoredCookie() {
  try {
    var cookie = $store.read(COOKIE_KEY);
    return cookie ? String(cookie).trim() : "";
  } catch (e) {
    console.log("[V2EX] Error reading cookie: " + e);
    return "";
  }
}

function saveCookie(cookie) {
  try {
    if (!cookie) return false;
    var oldCookie = getStoredCookie();
    if (oldCookie !== cookie) {
      $store.write(cookie, COOKIE_KEY);
      console.log("[V2EX] Cookie saved successfully");
      return true;
    }
    return false;
  } catch (e) {
    console.log("[V2EX] Error saving cookie: " + e);
    return false;
  }
}

function getErrMsg(e) {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e.error) return String(e.error);
  if (e.message) return String(e.message);
  return String(e);
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function buildHeaders(cookie) {
  var h = {};
  for (var k in COMMON_HEADERS) { h[k] = COMMON_HEADERS[k]; }
  h["Cookie"] = cookie;
  return h;
}

function fetchUrl(url, headers) {
  return $http.fetch({ url: url, headers: headers, method: "GET" })
    .then(function(resp) {
      var status = resp.statusCode || resp.status || "?";
      var body = resp.body || "";
      console.log("[V2EX] " + url + " -> " + status + " (" + body.length + " bytes)");
      return body;
    });
}

function formatBalance(html) {
  try {
    if (!html) return "";
    var block = html.match(/balance_area bigger[\s\S]*?<\/div>/);
    if (!block) return "";
    var gold = (block[0].match(/(\d+)\s*<img.*?alt="G"/) || [])[1] || "0";
    var silver = (block[0].match(/(\d+)\s*<img.*?alt="S"/) || [])[1] || "0";
    var bronze = (block[0].match(/(\d+)\s*<img.*?alt="B"/) || [])[1] || "0";
    return gold + " 金币, " + silver + " 银币, " + bronze + " 铜币";
  } catch (e) {
    console.log("[V2EX] Error parsing balance: " + e);
    return "";
  }
}

function getOnce(headers) {
  return fetchUrl("https://www.v2ex.com/mission/daily", headers)
    .then(function(html) {
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
      var once = onceMatch ? onceMatch[1] : "";
      return { once: once, logged_in: true, already: false, days: days };
    });
}

function checkIn(once, headers) {
  return fetchUrl("https://www.v2ex.com/mission/daily/redeem?once=" + once, headers);
}

function queryBalance(headers) {
  return fetchUrl("https://www.v2ex.com/balance", headers)
    .then(function(html) {
      var rewardMatch = html.match(/\d+ 的每日登录奖励 \d+ 铜币/);
      var reward = rewardMatch ? rewardMatch[0] : "";
      var bonusMatch = html.match(/每日登录奖励\s*([+-]?\d+)\s*铜币/);
      var bonus = bonusMatch ? bonusMatch[1] : "";
      var balance = formatBalance(html);
      return { reward: reward, bonus: bonus, balance: balance };
    });
}

function doCheckin(attempt, maxRetry, headers) {
  console.log("[V2EX] Attempt " + (attempt + 1) + "/" + maxRetry);
  return getOnce(headers)
    .then(function(info) {
      if (!info.logged_in) {
        console.log("[V2EX] Cookie expired");
        notify("V2EX", "Cookie 已失效", "请重新访问 V2EX 更新 Cookie");
        $done({});
        return;
      }
      if (info.already) {
        console.log("[V2EX] 已签到 | 连续 " + info.days + " 天");
        return queryBalance(headers)
          .then(function(q) {
            var logMsg = "[V2EX] 已签到 | 连续 " + info.days + " 天";
            if (q.balance) logMsg += " | " + q.balance;
            console.log(logMsg);
            var n = "连续签到 " + info.days + " 天";
            if (q.balance) n += "\n" + q.balance;
            notify("V2EX 今日已签到", "", n);
            $done({});
          });
      }
      if (!info.once) {
        console.log("[V2EX] 未找到 once 码");
        if (attempt + 1 < maxRetry) {
          console.log("[V2EX] Retrying in 3s...");
          return sleep(3000).then(function() { return doCheckin(attempt + 1, maxRetry, headers); });
        }
        notify("V2EX 签到失败", "未找到 once 码", "已达最大重试次数");
        $done({});
        return;
      }
      console.log("[V2EX] once=" + info.once + " | 连续 " + info.days + " 天");
      return checkIn(info.once, headers)
        .then(function() { return queryBalance(headers); })
        .then(function(q) {
          var logMsg = "[V2EX] 签到成功 | 连续 " + info.days + " 天";
          if (q.bonus) logMsg += " | 奖励 +" + q.bonus + " 铜币";
          if (q.balance) logMsg += " | " + q.balance;
          console.log(logMsg);
          var n = "连续签到 " + info.days + " 天";
          if (q.reward) n += "\n" + q.reward;
          if (q.balance) n += "\n余额 " + q.balance;
          notify("V2EX 签到成功", "", n);
          $done({});
        });
    })
    .catch(function(e) {
      console.log("[V2EX] Error: " + getErrMsg(e));
      if (attempt + 1 < maxRetry) {
        console.log("[V2EX] Retrying in 3s...");
        return sleep(3000).then(function() { return doCheckin(attempt + 1, maxRetry, headers); });
      }
      notify("V2EX 网络错误", "", getErrMsg(e));
      $done({});
    });
}

if (isGetHeader) {
  var allHeaders = $request.headers || {};
  var cookie = allHeaders.Cookie || allHeaders.cookie || "";
  if (!cookie) {
    console.log("[V2EX] Cookie not found in request headers");
  } else {
    var saved = saveCookie(cookie);
    if (saved) {
      notify("V2EX", "Cookie 已更新", "后续将用于自动签到");
    }
  }
  $done({});
} else {
  (function() {
    console.log("[V2EX] ===== 签到开始 =====");
    var storedCookie = getStoredCookie();
    if (!storedCookie) {
      console.log("[V2EX] No stored cookie found");
      notify("V2EX", "未获取到 Cookie", "请先访问 V2EX 个人主页");
      $done({});
      return;
    }
    var headers = buildHeaders(storedCookie);
    doCheckin(0, 3, headers)
      .then(function() {
        console.log("[V2EX] ===== 签到结束 =====");
      });
  })();
}
