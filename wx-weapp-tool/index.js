/*
 * @Author: zgt
 * @Date: 2019-07-03 15:33:01
 * @LastEditors: zgt
 * @LastEditTime: 2019-09-07 12:21:10
 * @Description: file content
 */
import { dataType, GenNonDuplicateID, firstWordToUpperCase } from '../zerod-ztool/index';
import md5 from './libs/md5.min';
import UUIDjs from './libs/uuid';
import { Base64 } from './libs/base64.min';
import { $wuxToptips } from '../wux-weapp-ex/index';
Promise.prototype.finally = function(callback) {
    let P = this.constructor;
    return this.then(
        (value) => P.resolve(callback()).then(() => value),
        (reason) =>
            P.resolve(callback()).then(() => {
                throw reason;
            }),
    );
};
function formatNumber(str, t = 2) {
    str = str.toString();
    while (str.length < t) {
        str = '0' + str;
    }
    return str;
}

//生成与后台协定的 X-Auth-Info
function getAuth(token = '123') {
    const key = GenNonDuplicateID().toString();
    const md5Key = md5(key);
    const md5Token = md5(token);
    let str = '';
    for (let index = 0; index < md5Key.length; index += 2) {
        const element = md5Key[index];
        str += element;
    }
    return `${md5Token},${key},${Base64.encode(`${md5Token}${str}`)}`;
}
//生成与后台协定的 X-Channel-Info
function getChannel(Auth) {
    const uuid = UUIDjs.create();
    // console.log("uuid", uuid);
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    const Msecond = date.getUTCMilliseconds();
    const str = `${year}${formatNumber(month)}${formatNumber(day)}${formatNumber(hour)}${formatNumber(
        minute,
    )}${formatNumber(second)}${formatNumber(Msecond, 3)}`;
    // console.log("timer", str);
    const tmp = `${uuid},${str},${md5(Auth)}`;
    const signature = Base64.encode(tmp);
    return `${uuid},${str},${signature}`;
}

function showRejectToast(re) {
    let wuxToast = null;
    try {
        wuxToast = $wuxToptips();
    } catch (e) {
        wuxToast = null;
    }
    const newResult = { ...re, msg: re.msg || re.message || re.error || re.data };
    const text =
        newResult && newResult.msg
            ? newResult.msg + (newResult.status ? `,status:${newResult.status}` : '')
            : '数据请求失败，请稍后重试';
    if (wuxToast) {
        wuxToast.error({
            text,
            hidden: true,
            duration: 3000,
        });
        return;
    }
    wx.showToast({
        title: text,
        icon: 'none',
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
    return new Promise((resolve, reject) => {
        let token = { token: '' };

        let userInfo = {};
        try {
            userInfo = JSON.parse(wx.getStorageSync('detail'));
            token = JSON.parse(wx.getStorageSync('token'));
        } catch (e) {}
        const Auth = getAuth(token.token);
        config = dataType.isObject(config) ? config : {};

        wx.request({
            ...config,
            ...{
                method: method.toLocaleUpperCase(),
                url,
                data: query,
                header: {
                    ...(dataType.isObject(config.header) ? config.header : {}),
                    'X-Token': token.token,
                    'X-Auth-Info': Auth,
                    'X-Channel-Info': getChannel(Auth),
                    'X-UserId': userInfo.userBO ? userInfo.userBO.id : '',
                },
                success: (re) => {
                    if (re.data.code == 0 || re.data.code == 200) {
                        resolve(re.data);
                    } else {
                        reject(re.data);
                        showRejectToast(re.data);
                    }
                },
                fail: (re) => {
                    reject(re.data);
                    showRejectToast(re.data);
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
    return new Promise((resolve, reject) => {
        wx[name]({
            ...(options || {}),
            success: function(res) {
                resolve(res);
            },
            fail: function(res) {
                reject(res);
            },
        });
    });
}

export function setStorageMethods() {
    const methods = {
        setItem: function(key, data) {
            wx.setStorageSync(key, dataType.isObject(data) || dataType.isArray(data) ? JSON.stringify(data) : data);
        },
        getItem: function(key, { isParse } = {}) {
            const saveData = wx.getStorageSync(key);
            return isParse && saveData ? JSON.parse(saveData) : saveData;
        },
        removeItem: function(key) {
            wx.removeStorageSync(key);
        },
        setItemAsync: function(key, data) {
            return wxAsyncPromise('setStorage', {
                key,
                data: dataType.isObject(data) || dataType.isArray(data) ? JSON.stringify(data) : data,
            });
        },
        getItemAsync: function(key, { isParse } = {}) {
            return wxAsyncPromise('getStorage', {
                key,
            }).then((res) => {
                const saveData = res.data;
                res.data = isParse && saveData ? JSON.parse(saveData) : saveData;
                return res;
            });
        },
        removeItemAsync: function(key) {
            return wxAsyncPromise('removeStorage', { key });
        },
    };

    const storage = new Proxy(
        {},
        {
            get: function(target, key, receiver) {
                if (
                    ['setItem', 'getItem', 'removeItem', 'setItemAsync', 'getItemAsync', 'removeItemAsync'].includes(
                        key,
                    )
                ) {
                    return methods[key];
                }

                const hasSet = key ? key.match(/^set[A-Z]{1}\w*$/) : null;
                const hasGet = key ? key.match(/^get[A-Z]{1}\w*$/) : null;
                if (hasSet) {
                    const storageKey = hasSet[0].replace(/^set/g, '').toLowerCase();
                    return function(data) {
                        methods.setItem(storageKey, data);
                    };
                } else if (hasGet) {
                    const storageKey = hasGet[0].replace(/^get/g, '').toLowerCase();
                    return function(opt) {
                        return methods.getItem(storageKey, opt);
                    };
                } else {
                    return () => {
                        return null;
                    };
                }
            },
        },
    );
    return storage;
    // storageKeys.forEach((key) => {
    //     try {
    //         wx.removeStorageSync(key);
    //     } catch (e) {}
    //     storage[`set${firstWordToUpperCase(key)}`] = function(data) {
    //         wx.setStorageSync(key, dataType.isObject(data) || dataType.isArray(data) ? JSON.stringify(data) : data);
    //     };
    //     storage[`get${firstWordToUpperCase(key)}`] = function({ isParse } = {}) {
    //         const saveData = wx.getStorageSync(key);
    //         return isParse && saveData ? JSON.parse(saveData) : saveData;
    //     };
    // });
    // return storage;
}

function wxOpenSetting(methodname, opt) {
    wxAsyncPromise('showModal', {
        title: '地理位置未授权',
        content: '请点击确定打开授权设置',
    }).then((res) => {
        //点了确定
        if (res.confirm) {
            wxAsyncPromise('openSetting').then((res) => {
                if (res.authSetting['scope.userLocation']) {
                    wxAsyncPromise(methodname, opt)
                        .then(opt.success)
                        .catch(opt.fail);
                } else {
                    wxOpenSetting(methodname, opt);
                }
            });
        }
    });
}

export function wxLocationApi(methodname, opt = {}) {
    wxAsyncPromise('getSetting').then((res) => {
        if (res.authSetting['scope.userLocation'] || res.authSetting['scope.userLocation'] === undefined) {
            wxAsyncPromise(methodname, opt)
                .then(opt.success)
                .catch(opt.fail);
        } else {
            wxOpenSetting(methodname, opt);
        }
    });
}

export default wxRequest;
