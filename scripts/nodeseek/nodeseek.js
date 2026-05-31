/****************************** 
脚本功能：NodeSeek 论坛签到
Version  : v1.2.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
访问 NodeSeek 个人页面保存请求头，定时任务自动签到。

[rewrite_local]
^https://www\.nodeseek\.com/api/account/getInfo/\d+\?readme=1$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js

[task_local]
30 8 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js, tag=NS签到, enabled=true

[MITM]
hostname = www.nodeseek.com
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
var SCRIPT_NAME = "NodeSeek";
var SCRIPT_VERSION = "v1.2.0";
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
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Manual");

  var allHeaders = $request.headers || {};
  var picked = pickNeedHeaders(allHeaders);

  if (!picked || Object.keys(picked).length === 0) {
    Logger.status("⚠️", "未抓到请求头");
    notifyFn("NodeSeek", "⚠️ 抓包失败", "未获取到请求头");
    $done({});
  } else {
    var ok = $store.write(JSON.stringify(picked), NS_HEADER_KEY);
    Logger.status("✅", ok ? "请求头已保存" : "保存失败");
    Logger.field("Fields", Object.keys(picked).length);
    notifyFn("NodeSeek", ok ? "✅ 抓包成功" : "❌ 保存失败", ok ? "请求头已保存" : "写入存储失败");
    $done({});
  }
} else {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Cron");

  var raw = $store.read(NS_HEADER_KEY);
  if (!raw) {
    Logger.envCheck(false, "Missing");
    Logger.status("⚠️", "缺少请求头");
    notifyFn("NodeSeek", "⚠️ 缺少请求头", "请先访问个人页面");
    $done();
  } else {
    var parsed = safeJsonParse(raw);
    var savedHeaders = parsed[0];

    if (!savedHeaders) {
      Logger.envCheck(false, "Invalid");
      Logger.status("⚠️", "请求头解析失败");
      notifyFn("NodeSeek", "❌ 请求头异常", "数据损坏，请重新抓包");
      $done();
    } else {
      Logger.envCheck(true, "Found");
      Logger.accountHeader(null, "www.nodeseek.com");

      var headers = {
        Connection: savedHeaders["Connection"] || "keep-alive",
        "Accept-Encoding": savedHeaders["Accept-Encoding"] || "gzip, deflate, br",
        Priority: savedHeaders["Priority"] || "u=3, i",
        "Content-Type": savedHeaders["Content-Type"] || "text/plain;charset=UTF-8",
        Origin: savedHeaders["Origin"] || "https://www.nodeseek.com",
        "refract-sign": savedHeaders["refract-sign"] || "",
        "User-Agent": savedHeaders["User-Agent"] || "Mozilla/5.0",
        "refract-key": savedHeaders["refract-key"] || "",
        "Sec-Fetch-Mode": savedHeaders["Sec-Fetch-Mode"] || "cors",
        Cookie: savedHeaders["Cookie"] || "",
        Host: savedHeaders["Host"] || "www.nodeseek.com",
        Referer: savedHeaders["Referer"] || "https://www.nodeseek.com/",
        "Accept-Language": savedHeaders["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
        Accept: savedHeaders["Accept"] || "*/*"
      };

      $http.fetch({
        url: "https://www.nodeseek.com/api/attendance?random=true",
        method: "POST", headers: headers, body: ""
      }).then(function (resp) {
        var status = resp.statusCode;
        var body = resp.body || "";
        var msg = "";
        var p = safeJsonParse(body);
        if (p[0]) msg = p[0].message ? String(p[0].message) : "";

        if (status === 403) {
          Logger.status("⚠️", "403 风控");
          Logger.separator();
          Logger.summary(1, 0, 0, 1, "被风控");
          notifyFn("NodeSeek", "⚠️ 被风控", "403，稍后重试");
        } else if (status === 500) {
          Logger.status("❌", "500 服务器错误");
          Logger.separator();
          Logger.summary(1, 0, 0, 1, "服务器错误");
          notifyFn("NodeSeek", "❌ 服务器错误", "500");
        } else if (status >= 200 && status < 300) {
          Logger.status("✅", "签到成功");
          if (msg) Logger.message(msg);
          Logger.separator();
          Logger.summary(1, 1, 0, 0, "签到成功");
          notifyFn("NodeSeek", "✅ 签到成功", msg || "签到完成");
        } else {
          Logger.status("❌", "请求异常 " + status);
          Logger.separator();
          Logger.summary(1, 0, 0, 1, "请求异常");
          notifyFn("NodeSeek", "❌ 请求异常", "HTTP " + status);
        }
        $done();
      }, function (reason) {
        Logger.status("❌", "网络错误");
        Logger.separator();
        Logger.summary(1, 0, 0, 1, "网络错误");
        notifyFn("NodeSeek", "❌ 网络错误", "请检查网络连接");
        $done();
      });
    }
  }
}
