/****************************** 
脚本功能：NS论坛签到
Version  : v1.1.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

[rewrite_local]
^https:\/\/www\.nodeseek\.com\/api\/account\/getInfo\/\d+\?readme=1$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js

[task_local]
30 8 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js, tag=NS签到, enabled=true

[MITM]
hostname = www.nodeseek.com

Loon:
[Script]
http-request ^https://www\.nodeseek\.com/api/account/getInfo/\d+\?readme=1$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js, requires-body=false, tag=NS抓包
cron "30 8 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js, tag=NS签到, enabled=true

[MITM]
hostname = www.nodeseek.com

Surge:
[Script]
NS抓包 = type=http-request, pattern=^https://www\.nodeseek\.com/api/account/getInfo/\d+\?readme=1$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js
NS签到 = type=cron, cronexp="30 8 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js, timeout=60

[MITM]
hostname = %APPEND% www.nodeseek.com
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
var SCRIPT_NAME = "NodeSeek";
var SCRIPT_VERSION = "v1.1.0";
var NS_HEADER_KEY = "NS_NodeseekHeaders";
var isGetHeader = typeof $request !== "undefined";

var NEED_KEYS = [
  "Connection", "Accept-Encoding", "Priority", "Content-Type", "Origin",
  "refract-sign", "User-Agent", "refract-key", "Sec-Fetch-Mode",
  "Cookie", "Host", "Referer", "Accept-Language", "Accept"
];

function safeJsonParse(text) {
  try { return [JSON.parse(text), null]; } catch (e) { return [null, e]; }
}

function getPlatform() {
  if (isQX) return "Quantumult X";
  if (isLoon) return "Loon";
  if (isSurge) return "Surge";
  return "Unknown";
}

function pickNeedHeaders(src) {
  var dst = {};
  var get = function (name) {
    return src[name] !== undefined ? src[name] : (src[name.toLowerCase()] !== undefined ? src[name.toLowerCase()] : src[name.toUpperCase()]);
  };
  for (var i = 0; i < NEED_KEYS.length; i++) {
    var v = get(NEED_KEYS[i]);
    if (v !== undefined) dst[NEED_KEYS[i]] = v;
  }
  return dst;
}

// ========== 主流程 ==========
if (isGetHeader) {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION);

  var allHeaders = $request.headers || {};
  var picked = pickNeedHeaders(allHeaders);

  if (!picked || Object.keys(picked).length === 0) {
    Logger.error("未抓到请求头");
    notifyFn("NS Headers 获取失败", "", "未获取到指定请求头，请重新再试一次");
    $done({});
  } else {
    var ok = $store.write(JSON.stringify(picked), NS_HEADER_KEY);
    Logger.success("已保存请求头 (" + Object.keys(picked).length + " 个字段)");
    notifyFn(ok ? "NS Headers 获取成功" : "NS Headers 保存失败", "", ok ? "指定请求头已持久化保存" : "写入持久化存储失败");
    Logger.scriptFinished();
    $done({});
  }
} else {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION);
  Logger.envCheck(getPlatform(), "Cron", true, null);

  var raw = $store.read(NS_HEADER_KEY);
  if (!raw) {
    Logger.configLoading(false, "Missing", 0);
    Logger.error("缺少请求头，请先抓包");
    notifyFn("NS签到结果", "无法签到", "本地没有已保存的请求头，请先访问一次个人页面");
    Logger.scriptFinished();
    $done();
  } else {
    var parsed = safeJsonParse(raw);
    var savedHeaders = parsed[0];
    var savedHeadersErr = parsed[1];

    if (savedHeadersErr || !savedHeaders) {
      Logger.configLoading(false, "Invalid", 0);
      Logger.error("请求头解析失败: " + savedHeadersErr);
      notifyFn("NS签到结果", "无法签到", "请求头数据损坏，请重新访问个人页面");
      Logger.scriptFinished();
      $done();
    } else {
      Logger.configLoading(true, "Found", 1);
      Logger.accountHeader(null, "www.nodeseek.com");

      var headers = {
        Connection: savedHeaders["Connection"] || "keep-alive",
        "Accept-Encoding": savedHeaders["Accept-Encoding"] || "gzip, deflate, br",
        Priority: savedHeaders["Priority"] || "u=3, i",
        "Content-Type": savedHeaders["Content-Type"] || "text/plain;charset=UTF-8",
        Origin: savedHeaders["Origin"] || "https://www.nodeseek.com",
        "refract-sign": savedHeaders["refract-sign"] || "",
        "User-Agent": savedHeaders["User-Agent"] || "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.2 Mobile/15E148 Safari/604.1",
        "refract-key": savedHeaders["refract-key"] || "",
        "Sec-Fetch-Mode": savedHeaders["Sec-Fetch-Mode"] || "cors",
        Cookie: savedHeaders["Cookie"] || "",
        Host: savedHeaders["Host"] || "www.nodeseek.com",
        Referer: savedHeaders["Referer"] || "https://www.nodeseek.com/sw.js?v=0.3.33",
        "Accept-Language": savedHeaders["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
        Accept: savedHeaders["Accept"] || "*/*"
      };

      $http.fetch({
        url: "https://www.nodeseek.com/api/attendance?random=true",
        method: "POST",
        headers: headers,
        body: ""
      }).then(function (resp) {
        var status = resp.statusCode;
        var body = resp.body || "";
        var msg = "";
        var parsed = safeJsonParse(body);
        var obj = parsed[0];

        if (obj) {
          msg = obj.message ? String(obj.message) : "";
        }

        if (status === 403) {
          Logger.status("⚠️", "403 风控");
          Logger.taskSummary(1, 0, 0, 1);
          notifyFn("NS签到结果", "403 风控", "暂时被风控，稍后再试" + (msg ? "\n内容: " + msg : ""));
        } else if (status === 500) {
          Logger.status("❌", "500 服务器错误");
          Logger.taskSummary(1, 0, 0, 1);
          notifyFn("NS签到结果", "500 服务器错误", msg || body || "无返回内容");
        } else if (status >= 200 && status < 300) {
          Logger.status("✅", "签到成功");
          Logger.taskSummary(1, 1, 0, 0);
          notifyFn("NS签到结果", "签到成功", msg || "签到成功");
        } else {
          Logger.status("❌", "请求异常 " + status);
          Logger.taskSummary(1, 0, 0, 1);
          notifyFn("NS签到结果", "请求异常 " + status, msg || body || "");
        }

        Logger.scriptFinished();
        $done();
      }, function (reason) {
        var err = reason && reason.error ? String(reason.error) : String(reason || "");
        Logger.status("❌", "网络错误: " + err);
        Logger.taskSummary(1, 0, 0, 1);
        notifyFn("NS签到结果", "请求错误", err);
        Logger.scriptFinished();
        $done();
      });
    }
  }
}