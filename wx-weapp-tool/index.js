import md5 from "./libs/md5.min";
const statusMsg = {
  401: "您的请求未经授权 401",
  403: "您的请求被拒绝 403",
  404: "您的请求内容不存在 404",
  405: "您的请求方式不被允许 405",
  500: "服务器出现意外情况 500",
  501: "服务器不支持您的请求方式 501",
  502: "服务器无响应 502",
  503: "服务器异常 503",
  504: "服务器无响应 504",
  505: "服务器不支持您的http方式 505",
};
const codeMsg = {
  "-1": "请求失败，请联系管理员",
  403403: "未登录或用户已过期，请重新登录",
};
import { $wuxToptips } from "../wux-weapp-ex/index";
// Promise.prototype.finally = function (callback) {
//   let P = this.constructor;
//   return this.then(
//     (value) => P.resolve(callback()).then(() => value),
//     (reason) =>
//       P.resolve(callback()).then(() => {
//         throw reason;
//       })
//   );
// };
export const GenNonDuplicateID = function (randomLength = 8) {
  const id = (
    Number((Math.random() + Math.random()).toString().substr(2, 13)) +
    Date.now()
  )
    .toString(36)
    .slice(-parseInt(randomLength, 10));
  return id;
};
export function createSign({ appCode, method, url, query }) {
  //任意字符串
  const nonce = GenNonDuplicateID().toString();
  //当前时间戳
  const timestamp = new Date(Date.now()).getTime();
  return {
    nonce,
    timestamp,
    //签名
    sign: md5(
      method +
        "\n" +
        nonce +
        "\n" +
        timestamp +
        "\n" +
        appCode +
        "\n" +
        (query ? JSON.stringify(query) : "")
    ),
  };
}
export function isObject(data) {
  return Object.prototype.toString.call(data) === "[object Object]";
}
export function showRejectToast(re, msgConfig) {
  msgConfig = msgConfig || {};
  re = re && typeof re !== "object" ? { msg: re } : re;
  let wuxToast = null;
  try {
    wuxToast = $wuxToptips();
  } catch (e) {
    wuxToast = null;
  }
  const newResult =
    typeof msgConfig.disposeResult === "function"
      ? msgConfig.disposeResult(re)
      : {
          ...re,
          msg: re.msg || re.message || re.error || re.data || re.errMsg,
        };
  const codemsgtext = codeMsg[newResult.code];
  const statusmsgtext = statusMsg[newResult.status];
  const text = codemsgtext || statusmsgtext || newResult.msg;
  if (!text) {
    return;
  }
  if (wuxToast) {
    wuxToast.error({
      text: `${text}\n${msgConfig.url || ""}`,
      hidden: true,
      duration: 3000,
    });
    return;
  }
  wx.showToast({
    title: text,
    icon: "none",
    duration: 3000,
  });
}
/**
 *
 *
 * @export
 * @param {string} method //get post delete ....
 * @param {string} url //接口地址
 * @param {object} query //接口请求参数
 * @param {object} config //wx.request的，除了method、url、data、success、fail的其他配置参数
 * @returns
 */

export function wxRequest(method, url, query, config) {
  method = method.toLowerCase();
  return new Promise((resolve, reject) => {
    // let token = { token: "" }
    let userInfo = {};
    try {
      // token = JSON.parse(wx.getStorageSync("token"));
      userInfo = JSON.parse(wx.getStorageSync("detail"));
    } catch (e) {}
    // const Auth = getAuth(token.token);
    config = isObject(config) ? config : {};
    const isToast = typeof config.isToast === "undefined" || config.isToast;
    delete config.isToast;
    const appCode = wx.getStorageSync("appCode") || "";
    const header = config.header || config.headers;
    wx.request({
      ...config,
      ...{
        method: method.toLocaleUpperCase(),
        url,
        data: query,
        header: {
          "X-AppCode": appCode,
          "X-UserId": userInfo.userBO ? userInfo.userBO.id : "",
          ...createSign({ method, url, query, appCode }),
          ...(isObject(header) ? header : {}),
        },
        success: (re) => {
          if (re.data.code == 0 || re.data.code == 200) {
            resolve(re.data || re);
          } else {
            console.log("wx.request success error", re);
            reject(re.data || re);
            if (isToast) {
              showRejectToast(re.data || re, { url });
            }
          }
        },
        fail: (re) => {
          console.log("wx.request fail", re);
          reject(re.data || re);
          if (isToast) {
            showRejectToast(re.data || re, { url });
          }
        },
      },
    });
  });
}
/**
 *
 *
 * @export
 * @param {string} name 微信api的名称 ，如 wxAsyncPromise("getSystemInfo",options)
 * @param {object} options 除了success 和 fail 的其他参数
 * @returns
 */
export function wxAsyncPromise(name, options) {
  const [first, second] = name.split(".");
  const fnName = first === "qy" && second ? wx[first][second] : wx[first];
  return new Promise((resolve, reject) => {
    fnName({
      ...(options ? options : {}),
      success: function (res) {
        resolve(res);
      },
      fail: function (res) {
        reject(res);
      },
    });
  });
}

export function setStorageMethods() {
  const methods = {
    setItem: function (key, data) {
      wx.setStorageSync(
        key,
        isObject(data) || Array.isArray(data) ? JSON.stringify(data) : data
      );
    },
    getItem: function (key, { isParse } = {}) {
      const saveData = wx.getStorageSync(key);
      return isParse && saveData ? JSON.parse(saveData) : saveData;
    },
    removeItem: function (key) {
      try {
        wx.removeStorageSync(key);
      } catch (e) {
        console.log(e);
      }
    },
    setItemAsync: function (key, data) {
      return wxAsyncPromise("setStorage", {
        key,
        data:
          isObject(data) || Array.isArray(data) ? JSON.stringify(data) : data,
      });
    },
    getItemAsync: function (key, { isParse } = {}) {
      return wxAsyncPromise("getStorage", {
        key,
      }).then((res) => {
        const saveData = res.data;
        res.data = isParse && saveData ? JSON.parse(saveData) : saveData;
        return res;
      });
    },
    removeItemAsync: function (key) {
      return wxAsyncPromise("removeStorage", { key });
    },
  };

  const storage = new Proxy(
    {},
    {
      get: function (target, key, receiver) {
        if (
          [
            "setItem",
            "getItem",
            "removeItem",
            "setItemAsync",
            "getItemAsync",
            "removeItemAsync",
          ].includes(key)
        ) {
          return methods[key];
        }

        const hasSet = key ? key.match(/^set[A-Z]{1}\w*$/) : null;
        const hasGet = key ? key.match(/^get[A-Z]{1}\w*$/) : null;
        if (hasSet) {
          const storageKey = hasSet[0].replace(/^set/g, "").toLowerCase();
          return function (data) {
            methods.setItem(storageKey, data);
          };
        } else if (hasGet) {
          const storageKey = hasGet[0].replace(/^get/g, "").toLowerCase();
          return function (opt) {
            return methods.getItem(storageKey, opt);
          };
        } else {
          return () => {
            return null;
          };
        }
      },
    }
  );
  return storage;
}

function wxOpenSetting(methodname, opt) {
  wxAsyncPromise("showModal", {
    title: "地理位置未授权",
    content: "请点击确定打开授权设置",
  }).then((res) => {
    //点了确定
    if (res.confirm) {
      wxAsyncPromise("openSetting").then((res) => {
        if (res.authSetting["scope.userLocation"]) {
          wxAsyncPromise(methodname, opt).then(opt.success).catch(opt.fail);
        } else {
          wxOpenSetting(methodname, opt);
        }
      });
    }
  });
}

export function wxLocationApi(methodname, opt = {}) {
  wxAsyncPromise("getSetting").then((res) => {
    if (
      res.authSetting["scope.userLocation"] ||
      res.authSetting["scope.userLocation"] === undefined
    ) {
      wxAsyncPromise(methodname, opt).then(opt.success).catch(opt.fail);
    } else {
      wxOpenSetting(methodname, opt);
    }
  });
}

export default wxRequest;
