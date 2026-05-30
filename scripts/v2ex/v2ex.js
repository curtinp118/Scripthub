/******************************
脚本功能：V2EX 每日签到
更新时间：2026-05-30
作者：Curtinp118

使用说明：先访问 V2EX 个人主页保存 Cookie，再由定时任务自动签到。

[rewrite_local]
^https:\/\/www\.v2ex\.com\/(mission|member).* url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/refs/heads/main/scripts/v2ex/v2ex.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/refs/heads/main/scripts/v2ex/v2ex.js, tag=V2EX 每日签到, enabled=true

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

function getStoredCookie() {
  try {
    var cookie = $store.read(COOKIE_KEY);
    return cookie ? String(cookie).trim() : "";
  } catch (e) {
    console.log("[V2EX] Error reading cookie:", e);
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
    console.log("[V2EX] Error saving cookie:", e);
    return false;
  }
}

function formatBalance(html) {
  try {
    if (!html) return "";
    var balanceBlock = html.match(/balance_area bigger[\s\S]*?<\/div>/);
    if (!balanceBlock) return "";
    var gold = (balanceBlock[0].match(/(\d+)\s*<img.*?alt="G"/) || [])[1];
    var silver = (balanceBlock[0].match(/(\d+)\s*<img.*?alt="S"/) || [])[1];
    var bronze = (balanceBlock[0].match(/(\d+)\s*<img.*?alt="B"/) || [])[1];
    var result = "";
    if (gold) result += gold + "金";
    if (silver) result += silver + "银";
    if (bronze) result += bronze + "铜";
    return result;
  } catch (e) {
    console.log("[V2EX] Error parsing balance:", e);
    return "";
  }
}

if (isGetHeader) {
  var allHeaders = $request.headers || {};
  var cookie = allHeaders.Cookie || allHeaders.cookie || "";
  if (!cookie) {
    console.log("[V2EX] Cookie not found in request headers");
    return $done({});
  }
  var saved = saveCookie(cookie);
  if (saved) {
    console.log("[V2EX] Cookie captured and updated");
    notify("V2EX", "Cookie 已更新", "后续将用于自动签到");
  }
  return $done({});
} else {
  (function() {
    var storedCookie = getStoredCookie();
    if (!storedCookie) {
      console.log("[V2EX] No stored cookie found");
      notify("V2EX", "未获取到 Cookie", "请先访问 V2EX 个人主页");
      $done();
      return;
    }
    var headers = {
      Cookie: storedCookie,
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      Referer: "https://www.v2ex.com/mission/daily"
    };
    $http.fetch({ url: "https://www.v2ex.com/mission/daily", headers: headers, method: "GET" })
      .then(function(resp) { return resp.body || ""; })
      .then(function(dailyPageHtml) {
        if (dailyPageHtml.includes("需要先登录")) {
          console.log("[V2EX] Cookie expired - login required");
          notify("V2EX", "Cookie 已失效", "请重新访问 V2EX 更新 Cookie");
          $done();
          return;
        }
        var daysMatch = dailyPageHtml.match(/已连续登录\s*(\d+)\s*天/);
        var days = daysMatch ? daysMatch[1] : "?";
        var onceMatch = dailyPageHtml.match(/redeem\?once=(\d+)/);
        var once = onceMatch ? onceMatch[1] : "";
        if (once) {
          console.log("[V2EX] Performing checkin with once code:", once);
          $http.fetch({ url: "https://www.v2ex.com/mission/daily/redeem?once=" + once, headers: headers, method: "GET" })
            .then(function() {
              return $http.fetch({ url: "https://www.v2ex.com/mission/daily", headers: headers, method: "GET" });
            })
            .then(function(resp) { return resp.body || ""; })
            .then(function(confirmPageHtml) {
              var confirmDaysMatch = confirmPageHtml.match(/已连续登录\s*(\d+)\s*天/);
              var confirmDays = confirmDaysMatch ? confirmDaysMatch[1] : days;
              return $http.fetch({ url: "https://www.v2ex.com/balance", headers: headers, method: "GET" })
                .then(function(resp) { return resp.body || ""; })
                .then(function(balancePageHtml) {
                  var rewardMatch = balancePageHtml.match(/每日登录奖励\s*([+-]?\d+)\s*铜币/);
                  var reward = rewardMatch ? rewardMatch[1] : "";
                  var logMsg = "[V2EX] 成功 | 连续 " + confirmDays + " 天" + (reward ? " | 奖励 " + reward + " 铜币" : "");
                  console.log(logMsg);
                  var notifyContent = "连续签到 " + confirmDays + " 天";
                  if (reward) notifyContent += "\n获得 " + reward + " 铜币";
                  notify("V2EX 签到成功", "", notifyContent);
                  $done();
                });
            })
            .catch(function(e) {
              var errMsg = (e && e.error) ? String(e.error) : String((e && e.message) || e || "Unknown error");
              console.log("[V2EX] 网络错误 | " + errMsg);
              notify("V2EX 网络错误", "", errMsg);
              $done();
            });
        } else if (dailyPageHtml.includes("每日登录奖励已领取")) {
          $http.fetch({ url: "https://www.v2ex.com/balance", headers: headers, method: "GET" })
            .then(function(resp) { return resp.body || ""; })
            .then(function(balancePageHtml) {
              var balance = formatBalance(balancePageHtml);
              var logMsg = "[V2EX] 已签到 | 连续 " + days + " 天" + (balance ? " | 余额 " + balance : "");
              console.log(logMsg);
              var notifyContent = "连续签到 " + days + " 天";
              if (balance) notifyContent += "\n余额 " + balance;
              notify("V2EX 今日已签到", "", notifyContent);
              $done();
            })
            .catch(function(e) {
              var errMsg = (e && e.error) ? String(e.error) : String((e && e.message) || e || "Unknown error");
              console.log("[V2EX] 网络错误 | " + errMsg);
              notify("V2EX 网络错误", "", errMsg);
              $done();
            });
        } else {
          console.log("[V2EX] 签到失败 | 未找到 once 码");
          notify("V2EX 签到失败", "未找到 once 码", "请检查页面是否加载正常");
          $done();
        }
      })
      .catch(function(e) {
        var errMsg = (e && e.error) ? String(e.error) : String((e && e.message) || e || "Unknown error");
        console.log("[V2EX] 网络错误 | " + errMsg);
        notify("V2EX 网络错误", "", errMsg);
        $done();
      });
  })();
}
