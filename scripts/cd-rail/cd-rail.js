/****************************** 
脚本功能：成都地铁签到(积分)
Version  : v1.1.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

说明：打开成都地铁-我的-会员中心 点击签到按钮 手动签到一次 脚本将自动保存用户信息

[rewrite_local]
^https:\/\/app\.cdmetro\.chengdurail\.cn\/platform\/users\/user\/sign-in-integral(-day)?(\?.*)?$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js, tag=成都地铁签到, enabled=true

[MITM]
hostname = app.cdmetro.chengdurail.cn

Loon:
[Script]
http-request ^https://app\.cdmetro\.chengdurail\.cn/platform/users/user/sign-in-integral(-day)? script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js, requires-body=false, tag=成都地铁抓包
cron "10 9 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js, tag=成都地铁签到, enabled=true

[MITM]
hostname = app.cdmetro.chengdurail.cn

Surge:
[Script]
成都地铁抓包 = type=http-request, pattern=^https://app\.cdmetro\.chengdurail\.cn/platform/users/user/sign-in-integral(-day)?, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js
成都地铁签到 = type=cron, cronexp="10 9 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js, timeout=60

[MITM]
hostname = %APPEND% app.cdmetro.chengdurail.cn
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
var SCRIPT_NAME = "CDRail";
var SCRIPT_VERSION = "v1.1.0";
var CD_HEADER_KEY = "CD_CDRailHeaders";
var isGetHeader = typeof $request !== "undefined";

var NEED_KEYS = [
  "Connection", "Accept-Encoding", "Accept", "Accept-Language", "Content-Type",
  "Host", "User-Agent", "system-version", "system", "app-version", "appVersion",
  "device-id", "deviceId", "source", "vendor", "language", "user", "token", "app-token", "Cookie"
];

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
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
    notifyFn("成都地铁", "未抓到请求头", "请在 App 内打开签到页，触发一次签到请求后再试");
    $done({});
  } else {
    var ok = $store.write(JSON.stringify(picked), CD_HEADER_KEY);
    Logger.success("已保存请求头 (" + Object.keys(picked).length + " 个字段)");
    notifyFn(ok ? "成都地铁 用户信息 获取成功" : "成都地铁 Headers 保存失败", "", ok ? "已保存用户信息，后续将用于自动签到" : "保存失败，请检查配置");
    Logger.scriptFinished();
    $done({});
  }
} else {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION);
  Logger.envCheck(getPlatform(), "Cron", true, null);

  var raw = $store.read(CD_HEADER_KEY);
  if (!raw) {
    Logger.configLoading(false, "Missing", 0);
    Logger.error("缺少请求头，请先抓包");
    notifyFn("成都地铁", "缺少请求头", "请先抓包：在 App 内触发一次签到请求");
    Logger.scriptFinished();
    $done();
  } else {
    var savedHeaders = safeJsonParse(raw);
    if (!savedHeaders) {
      Logger.configLoading(false, "Invalid", 0);
      Logger.error("请求头解析失败");
      notifyFn("成都地铁", "请求头异常", "解析失败，请重新抓包");
      Logger.scriptFinished();
      $done();
    } else {
      Logger.configLoading(true, "Found", 1);
      Logger.accountHeader(null, "app.cdmetro.chengdurail.cn");

      var headers = {
        Connection: savedHeaders["Connection"] || "keep-alive",
        "Accept-Encoding": savedHeaders["Accept-Encoding"] || "gzip, deflate, br",
        Accept: savedHeaders["Accept"] || "*/*",
        "Accept-Language": savedHeaders["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
        Host: savedHeaders["Host"] || "app.cdmetro.chengdurail.cn",
        "User-Agent": savedHeaders["User-Agent"] || "CDMetro",
        "system-version": savedHeaders["system-version"] || "",
        system: savedHeaders["system"] || "",
        "app-version": savedHeaders["app-version"] || "",
        appVersion: savedHeaders["appVersion"] || "",
        "device-id": savedHeaders["device-id"] || savedHeaders["deviceId"] || "",
        deviceId: savedHeaders["deviceId"] || savedHeaders["device-id"] || "",
        source: savedHeaders["source"] || "",
        vendor: savedHeaders["vendor"] || "",
        language: savedHeaders["language"] || "",
        user: savedHeaders["user"] || "",
        token: savedHeaders["token"] || "",
        "app-token": savedHeaders["app-token"] || "",
        Cookie: savedHeaders["Cookie"] || ""
      };

      $http.fetch({
        url: "https://app.cdmetro.chengdurail.cn/platform/users/user/sign-in-integral",
        method: "GET",
        headers: headers
      }).then(function (resp) {
        var status = resp.statusCode;
        var body = resp.body || "";
        var obj = safeJsonParse(body);
        var msg = "", code = "", integralIncrement;

        if (obj) {
          msg = obj.message ? String(obj.message) : (obj.msg ? String(obj.msg) : "");
          code = obj.code !== undefined ? String(obj.code) : (obj.status !== undefined ? String(obj.status) : "");
          integralIncrement = obj.data && obj.data.integralIncrement;
        }

        if (status === 401 || status === 403) {
          Logger.status("❌", "登录失效 HTTP " + status);
          Logger.taskSummary(1, 0, 0, 1);
          notifyFn("成都地铁", "登录失效", "HTTP " + status + "，请重新抓包");
        } else if (status >= 200 && status < 300) {
          if (code === "0" && (msg === "SUCCESS" || msg === "")) {
            var inc = integralIncrement !== undefined ? String(integralIncrement) : "";
            Logger.status("✅", "签到成功");
            if (inc) Logger.points("+" + inc);
            Logger.taskSummary(1, 1, 0, 0);
            notifyFn("成都地铁", "签到成功", inc ? "获得积分 +" + inc : "签到成功");
          } else if (code === "1102") {
            Logger.status("🔄", "今日已签到");
            Logger.taskSummary(1, 0, 1, 0);
            notifyFn("成都地铁", "今日已签到", msg || "请勿重复签到！");
          } else {
            Logger.status("❌", (msg || "未知返回") + (code ? " (code=" + code + ")" : ""));
            Logger.taskSummary(1, 0, 0, 1);
            notifyFn("成都地铁", "返回异常", (msg || "未知返回") + (code ? " (code=" + code + ")" : ""));
          }
        } else {
          Logger.status("❌", "接口异常 " + status);
          Logger.taskSummary(1, 0, 0, 1);
          notifyFn("成都地铁", "接口异常 " + status, msg || body || "");
        }

        Logger.scriptFinished();
        $done();
      }, function (reason) {
        var err = reason && reason.error ? String(reason.error) : String(reason || "");
        Logger.status("❌", "网络错误: " + err);
        Logger.taskSummary(1, 0, 0, 1);
        notifyFn("成都地铁", "网络错误", err);
        Logger.scriptFinished();
        $done();
      });
    }
  }
}