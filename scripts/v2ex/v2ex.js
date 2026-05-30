     1|/******************************
     2|脚本功能：V2EX 每日签到
     3|更新时间：2026-05-30
     4|作者：Curtinp118
     5|
     6|使用说明：先访问 V2EX 个人主页保存 Cookie，再由定时任务自动签到。
     7|
     8|[rewrite_local]
     9|^https:\/\/www\.v2ex\.com\/(mission|member).* url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js
    10|
    11|[task_local]
    12|10 9 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, tag=V2EX 每日签到, enabled=true
    13|
    14|[MITM]
    15|hostname = %APPEND% www.v2ex.com
    16|*******************************/
    17|
    18|var isQX = typeof $task !== "undefined";
    19|var isLoon = typeof $loon !== "undefined";
    20|var isSurge = typeof $httpClient !== "undefined" && !isLoon;
    21|
    22|var $http = {
    23|  fetch: function(opts) {
    24|    if (isQX) return $task.fetch(opts);
    25|    return new Promise(function(resolve, reject) {
    26|      var method = (opts.method || "GET").toUpperCase();
    27|      var handler = function(err, resp, data) {
    28|        if (err) reject(err);
    29|        else resolve({ statusCode: resp.statusCode, headers: resp.headers, body: data });
    30|      };
    31|      if (method === "POST") $httpClient.post(opts, handler);
    32|      else $httpClient.get(opts, handler);
    33|    });
    34|  }
    35|};
    36|
    37|var $store = {
    38|  read: function(key) { return isQX ? $prefs.valueForKey(key) : $persistentStore.read(key); },
    39|  write: function(val, key) { return isQX ? $prefs.setValueForKey(val, key) : $persistentStore.write(val, key); }
    40|};
    41|
    42|var notify = isQX
    43|  ? function(t, s, b) { $notify(t, s, b); }
    44|  : function(t, s, b) { $notification.post(t, s, b); };
    45|
    46|var COOKIE_KEY = "V2EX_Cookie";
    47|var isGetHeader = typeof $request !== "undefined";
    48|
    49|function getStoredCookie() {
    50|  try {
    51|    var cookie = $store.read(COOKIE_KEY);
    52|    return cookie ? String(cookie).trim() : "";
    53|  } catch (e) {
    54|    console.log("[V2EX] Error reading cookie:", e);
    55|    return "";
    56|  }
    57|}
    58|
    59|function saveCookie(cookie) {
    60|  try {
    61|    if (!cookie) return false;
    62|    var oldCookie = getStoredCookie();
    63|    if (oldCookie !== cookie) {
    64|      $store.write(cookie, COOKIE_KEY);
    65|      console.log("[V2EX] Cookie saved successfully");
    66|      return true;
    67|    }
    68|    return false;
    69|  } catch (e) {
    70|    console.log("[V2EX] Error saving cookie:", e);
    71|    return false;
    72|  }
    73|}
    74|
    75|function formatBalance(html) {
    76|  try {
    77|    if (!html) return "";
    78|    var balanceBlock = html.match(/balance_area bigger[\s\S]*?<\/div>/);
    79|    if (!balanceBlock) return "";
    80|    var gold = (balanceBlock[0].match(/(\d+)\s*<img.*?alt="G"/) || [])[1];
    81|    var silver = (balanceBlock[0].match(/(\d+)\s*<img.*?alt="S"/) || [])[1];
    82|    var bronze = (balanceBlock[0].match(/(\d+)\s*<img.*?alt="B"/) || [])[1];
    83|    var result = "";
    84|    if (gold) result += gold + "金";
    85|    if (silver) result += silver + "银";
    86|    if (bronze) result += bronze + "铜";
    87|    return result;
    88|  } catch (e) {
    89|    console.log("[V2EX] Error parsing balance:", e);
    90|    return "";
    91|  }
    92|}
    93|
    94|if (isGetHeader) {
    95|  var allHeaders = $request.headers || {};
    96|  var cookie = allHeaders.Cookie || allHeaders.cookie || "";
    97|  if (!cookie) {
    98|    console.log("[V2EX] Cookie not found in request headers");
    99|    return $done({});
   100|  }
   101|  var saved = saveCookie(cookie);
   102|  if (saved) {
   103|    console.log("[V2EX] Cookie captured and updated");
   104|    notify("V2EX", "Cookie 已更新", "后续将用于自动签到");
   105|  }
   106|  return $done({});
   107|} else {
   108|  (function() {
   109|    var storedCookie = getStoredCookie();
   110|    if (!storedCookie) {
   111|      console.log("[V2EX] No stored cookie found");
   112|      notify("V2EX", "未获取到 Cookie", "请先访问 V2EX 个人主页");
   113|      $done();
   114|      return;
   115|    }
   116|    var headers = {
   117|      Cookie: storedCookie,
   118|      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
   119|      Referer: "https://www.v2ex.com/mission/daily"
   120|    };
   121|    $http.fetch({ url: "https://www.v2ex.com/mission/daily", headers: headers, method: "GET" })
   122|      .then(function(resp) { return resp.body || ""; })
   123|      .then(function(dailyPageHtml) {
   124|        if (dailyPageHtml.includes("需要先登录")) {
   125|          console.log("[V2EX] Cookie expired - login required");
   126|          notify("V2EX", "Cookie 已失效", "请重新访问 V2EX 更新 Cookie");
   127|          $done();
   128|          return;
   129|        }
   130|        var daysMatch = dailyPageHtml.match(/已连续登录\s*(\d+)\s*天/);
   131|        var days = daysMatch ? daysMatch[1] : "?";
   132|        var onceMatch = dailyPageHtml.match(/redeem\?once=(\d+)/);
   133|        var once = onceMatch ? onceMatch[1] : "";
   134|        if (once) {
   135|          console.log("[V2EX] Performing checkin with once code:", once);
   136|          $http.fetch({ url: "https://www.v2ex.com/mission/daily/redeem?once=" + once, headers: headers, method: "GET" })
   137|            .then(function() {
   138|              return $http.fetch({ url: "https://www.v2ex.com/mission/daily", headers: headers, method: "GET" });
   139|            })
   140|            .then(function(resp) { return resp.body || ""; })
   141|            .then(function(confirmPageHtml) {
   142|              var confirmDaysMatch = confirmPageHtml.match(/已连续登录\s*(\d+)\s*天/);
   143|              var confirmDays = confirmDaysMatch ? confirmDaysMatch[1] : days;
   144|              return $http.fetch({ url: "https://www.v2ex.com/balance", headers: headers, method: "GET" })
   145|                .then(function(resp) { return resp.body || ""; })
   146|                .then(function(balancePageHtml) {
   147|                  var rewardMatch = balancePageHtml.match(/每日登录奖励\s*([+-]?\d+)\s*铜币/);
   148|                  var reward = rewardMatch ? rewardMatch[1] : "";
   149|                  var logMsg = "[V2EX] 成功 | 连续 " + confirmDays + " 天" + (reward ? " | 奖励 " + reward + " 铜币" : "");
   150|                  console.log(logMsg);
   151|                  var notifyContent = "连续签到 " + confirmDays + " 天";
   152|                  if (reward) notifyContent += "\n获得 " + reward + " 铜币";
   153|                  notify("V2EX 签到成功", "", notifyContent);
   154|                  $done();
   155|                });
   156|            })
   157|            .catch(function(e) {
   158|              var errMsg = (e && e.error) ? String(e.error) : String((e && e.message) || e || "Unknown error");
   159|              console.log("[V2EX] 网络错误 | " + errMsg);
   160|              notify("V2EX 网络错误", "", errMsg);
   161|              $done();
   162|            });
   163|        } else if (dailyPageHtml.includes("每日登录奖励已领取")) {
   164|          $http.fetch({ url: "https://www.v2ex.com/balance", headers: headers, method: "GET" })
   165|            .then(function(resp) { return resp.body || ""; })
   166|            .then(function(balancePageHtml) {
   167|              var balance = formatBalance(balancePageHtml);
   168|              var logMsg = "[V2EX] 已签到 | 连续 " + days + " 天" + (balance ? " | 余额 " + balance : "");
   169|              console.log(logMsg);
   170|              var notifyContent = "连续签到 " + days + " 天";
   171|              if (balance) notifyContent += "\n余额 " + balance;
   172|              notify("V2EX 今日已签到", "", notifyContent);
   173|              $done();
   174|            })
   175|            .catch(function(e) {
   176|              var errMsg = (e && e.error) ? String(e.error) : String((e && e.message) || e || "Unknown error");
   177|              console.log("[V2EX] 网络错误 | " + errMsg);
   178|              notify("V2EX 网络错误", "", errMsg);
   179|              $done();
   180|            });
   181|        } else {
   182|          console.log("[V2EX] 签到失败 | 未找到 once 码");
   183|          notify("V2EX 签到失败", "未找到 once 码", "请检查页面是否加载正常");
   184|          $done();
   185|        }
   186|      })
   187|      .catch(function(e) {
   188|        var errMsg = (e && e.error) ? String(e.error) : String((e && e.message) || e || "Unknown error");
   189|        console.log("[V2EX] 网络错误 | " + errMsg);
   190|        notify("V2EX 网络错误", "", errMsg);
   191|        $done();
   192|      });
   193|  })();
   194|}
   195|