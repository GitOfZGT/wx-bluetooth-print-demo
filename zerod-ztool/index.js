/*
 * @Author: zgt
 * @Date: 2019-06-24 11:04:00
 * @LastEditors: zgt
 * @LastEditTime: 2019-08-16 15:25:55
 * @Description: file content
 */
/*加载一批文件，_files:文件路径数组,可包括js,css,less文件,isSequence 是否按数组的顺序加载*/
export const loadFileList = (function() {
  /* 已加载文件缓存列表,用于判断文件是否已加载过，若已加载则不再次加载*/
  let classcodes = [];
  /*加载JS文件,url:文件路径*/
  const loadFile = function(url) {
    let newUrl = "";
    let protos = null;
    if (dataTypeTest(url) === "object") {
      newUrl = url.url;
      protos = url.protos;
    } else {
      newUrl = url;
    }
    if (!FileIsExt(classcodes, newUrl)) {
      var ThisType = GetFileType(newUrl);
      var fileObj = null;
      if (ThisType == ".js" || ThisType == "http") {
        fileObj = document && document.createElement("script");
        fileObj.src = newUrl;
      } else if (ThisType == ".css") {
        fileObj = document && document.createElement("link");
        fileObj.href = newUrl;
        fileObj.type = "text/css";
        fileObj.rel = "stylesheet";
      } else if (ThisType == ".less") {
        fileObj = document && document.createElement("link");
        fileObj.href = newUrl;
        fileObj.type = "text/css";
        fileObj.rel = "stylesheet/less";
      }
      if (dataTypeTest(protos) === "object" && fileObj) {
        Object.keys(protos).forEach(key => {
          fileObj[key] = protos[key];
        });
      }
      if (fileObj)
        return new Promise(function(resolve, reject) {
          fileObj.onload = fileObj.onreadystatechange = function() {
            if (
              !this.readyState ||
              "loaded" === this.readyState ||
              "complete" === this.readyState
            ) {
              // success();
              classcodes.push(newUrl);
              resolve();
            }
          };
          document &&
            document.getElementsByTagName("head")[0].appendChild(fileObj);
        });
      else return Promise.resolve();
    } else {
      return Promise.resolve();
    }
  };
  /*获取文件类型,后缀名，小写*/
  const GetFileType = function(url) {
    if (url != null && url.length > 0) {
      const lasindex = url.lastIndexOf(".");
      if (lasindex > -1) {
        return url.substr(url.lastIndexOf(".")).toLowerCase();
      } else if (/^(http:|https:)/.test(url)) {
        return "http";
      }
    }
    return "";
  };
  /*文件是否已加载*/
  const FileIsExt = function(FileArray, _url) {
    if (FileArray != null && FileArray.length > 0) {
      var len = FileArray.length;
      for (var i = 0; i < len; i++) {
        if (FileArray[i] == _url) {
          return true;
        }
      }
    }
    return false;
  };
  return function(_files, isSequence) {
    var FileArray = [];
    if (dataTypeTest(_files) === "array") {
      FileArray = _files;
    } else if (dataTypeTest(_files) === "string") {
      /*如果文件列表是字符串，则用,切分成数组*/
      FileArray = _files.split(",");
    }
    if (FileArray != null && FileArray.length > 0) {
      var LoadedCount = 0;
      if (isSequence) {
        //依次加载
        return new Promise(function(resolve, reject) {
          const len = FileArray.length;
          let P = loadFile(FileArray.shift());
          for (var i = 0; i < len - 1; i++) {
            const url = FileArray[i];
            P = P.then(function() {
              LoadedCount++;
              return loadFile(url);
            });
          }
          P.then(function() {
            LoadedCount++;
            if (LoadedCount === len) {
              resolve();
            }
          });
        });
      } else {
        //非依次加载
        return new Promise(function(resolve, reject) {
          const len = FileArray.length;
          for (var i = 0; i < len; i++) {
            const url = FileArray[i];
            loadFile(url).then(function() {
              LoadedCount++;
              if (LoadedCount === len) {
                resolve();
              }
            });
          }
        });
      }
    } else {
      return Promise.reject();
    }
  };
})();
// import Vue from 'vue';

// const isServer = Vue.prototype.$isServer;
const isServer = false;
const SPECIAL_CHARS_REGEXP = /([\:\-\_]+(.))/g;
const MOZ_HACK_REGEXP = /^moz([A-Z])/;
const ieVersion = isServer ? 0 : Number(document ? document.documentMode : 0);

/* 去掉字符串首尾空格 */
const trim = function(string) {
  return (string || "").replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, "");
};
/* istanbul ignore next */
const camelCase = function(name) {
  return name
    .replace(SPECIAL_CHARS_REGEXP, function(_, separator, letter, offset) {
      return offset ? letter.toUpperCase() : letter;
    })
    .replace(MOZ_HACK_REGEXP, "Moz$1");
};
//绑定不重复的事件
const hasListenerEvents = [];
export const onNoRepeatEvent = function(element, event, handler) {
  let hasBanded = null;
  let index = 0;
  for (let i = 0; i < hasListenerEvents.length; i++) {
    const item = hasListenerEvents[i];
    if (item.element == element && item.event == event) {
      hasBanded = item;
      index = i;
      break;
    }
  }
  if (hasBanded) {
    off(hasBanded.element, hasBanded.event, hasBanded.handler);
    on(element, event, handler);
    hasListenerEvents.splice(index, 1, { element, event, handler });
  } else {
    on(element, event, handler);
    hasListenerEvents.push({ element, event, handler });
  }
};
/* 绑定事件on(element, event, handler) */
export const on = (function() {
  if (!isServer && document && document.addEventListener) {
    return function(element, event, handler) {
      if (element && event && handler) {
        element.addEventListener(event, handler, false);
      }
    };
  } else {
    return function(element, event, handler) {
      if (element && event && handler) {
        element.attachEvent("on" + event, handler);
      }
    };
  }
})();

/* 绑定事件off(element, event, handler) */
export const off = (function() {
  if (!isServer && document && document.removeEventListener) {
    return function(element, event, handler) {
      if (element && event) {
        element.removeEventListener(event, handler, false);
      }
    };
  } else {
    return function(element, event, handler) {
      if (element && event) {
        element.detachEvent("on" + event, handler);
      }
    };
  }
})();

/* 绑定一次性事件one(element, event, handler) */
export const once = function(el, event, fn) {
  var listener = function() {
    if (fn) {
      fn.apply(this, arguments);
    }
    off(el, event, listener);
  };
  on(el, event, listener);
};

/* 是否存在某个样式类名 */
export function hasClass(el, cls) {
  if (!el || !cls) return false;
  if (cls.indexOf(" ") !== -1)
    throw new Error("className should not contain space.");
  if (el.classList) {
    return el.classList.contains(cls);
  } else {
    return (" " + el.className + " ").indexOf(" " + cls + " ") > -1;
  }
}

/* 添加className */
export function addClass(el, cls) {
  if (!el) return;
  var curClass = el.className;
  var classes = (cls || "").split(" ");

  for (var i = 0, j = classes.length; i < j; i++) {
    var clsName = classes[i];
    if (!clsName) continue;

    if (el.classList) {
      el.classList.add(clsName);
    } else {
      if (!hasClass(el, clsName)) {
        curClass += " " + clsName;
      }
    }
  }
  if (!el.classList) {
    el.className = curClass;
  }
}

/* 移除className */
export function removeClass(el, cls) {
  if (!el || !cls) return;
  var classes = cls.split(" ");
  var curClass = " " + el.className + " ";

  for (var i = 0, j = classes.length; i < j; i++) {
    var clsName = classes[i];
    if (!clsName) continue;

    if (el.classList) {
      el.classList.remove(clsName);
    } else {
      if (hasClass(el, clsName)) {
        curClass = curClass.replace(" " + clsName + " ", " ");
      }
    }
  }
  if (!el.classList) {
    el.className = trim(curClass);
  }
}

/* 获取某个元素的某个样式 */
export const getStyle =
  ieVersion < 9
    ? function(element, styleName) {
        if (isServer) return;
        if (!element || !styleName) return null;
        styleName = camelCase(styleName);
        if (styleName === "float") {
          styleName = "styleFloat";
        }
        try {
          switch (styleName) {
            case "opacity":
              try {
                return element.filters.item("alpha").opacity / 100;
              } catch (e) {
                return 1.0;
              }
            default:
              return element.style[styleName] || element.currentStyle
                ? element.currentStyle[styleName]
                : null;
          }
        } catch (e) {
          return element.style[styleName];
        }
      }
    : function(element, styleName) {
        if (isServer) return;
        if (!element || !styleName) return null;
        styleName = camelCase(styleName);
        if (styleName === "float") {
          styleName = "cssFloat";
        }
        try {
          var computed =
            document && document.defaultView.getComputedStyle(element, "");
          return element.style[styleName] || computed
            ? computed[styleName]
            : null;
        } catch (e) {
          return element.style[styleName];
        }
      };

/* 给某个元素设置 style */
export function setStyle(element, styleName, value) {
  if (!element || !styleName) return;

  if (typeof styleName === "object") {
    for (var prop in styleName) {
      if (styleName.hasOwnProperty(prop)) {
        setStyle(element, prop, styleName[prop]);
      }
    }
  } else {
    styleName = camelCase(styleName);
    if (styleName === "opacity" && ieVersion < 9) {
      element.style.filter = isNaN(value)
        ? ""
        : "alpha(opacity=" + value * 100 + ")";
    } else {
      element.style[styleName] = value;
    }
  }
}
//首字母大写
export const firstWordToUpperCase = function(str) {
  return str.toLowerCase().replace(/( |^)[a-z]/g, L => L.toUpperCase());
};
const data_types = {
  array: "[object Array]",
  object: "[object Object]",
  string: "[object String]",
  number: "[object Number]",
  boolean: "[object Boolean]",
  null: "[object Null]",
  undefined: "[object Undefined]",
  function: "[object Function]",
  date: "[object Date]",
  symbol: "[object Symbol]",
  set: "[object Set]",
  Map: "[object Map]",
  regExp: "[object RegExp]",
  json: "[object JSON]", //JSON对象
  promise: "[object Promise]", //Promise对象
  element: /HTML\w+Element/g
};
// 包含isArray,isObject,isString,isPromise等等
export const dataType = {};
Object.keys(data_types).forEach(key => {
  dataType["is" + firstWordToUpperCase(key)] = function(item) {
    return dataTypeTest(item) === key;
  };
});
//检测数据类型 ，返回对应数据类型的名称
export const dataTypeTest = function(item) {
  const types = Object.keys(data_types);
  let hasType = null;
  const value = Object.prototype.toString.call(item);
  for (let index = 0; index < types.length; index++) {
    const key = types[index];
    if (
      value === data_types[key] ||
      (Object.prototype.toString.call(data_types[key]) === "[object RegExp]" &&
        value.search(data_types[key]) > -1)
    ) {
      hasType = key;
      break;
    }
  }
  return hasType;
};
//深度复制对象
export const deepCopyObject = function(obj) {
  if (!obj || dataTypeTest(obj) !== "object") return {};
  // return JSON.parse(JSON.stringify(obj));
  let newobj = {};
  for (var key in obj) {
    var type = dataTypeTest(obj[key]);
    switch (type) {
      case "string":
      case "null":
      case "number":
      case "undefined":
      case "function":
      case "boolean":
      case "symbol":
      case "set":
      case "map":
      case "json":
      case "promise":
      case "regExp":
      case "element":
        newobj[key] = obj[key];
        break;
      case "date":
        newobj[key] = obj[key].getTime();
        break;
      case "array":
        newobj[key] = deepCopyArray(obj[key]);
        break;
      case "object":
        newobj[key] = deepCopyObject(obj[key]);
        break;
    }
  }

  return newobj;
};
//深度复制数组
export const deepCopyArray = function(array) {
  if (!array || dataTypeTest(array) !== "array") return [];
  // return JSON.parse(JSON.stringify(array));
  var newarray = [];
  for (var i = 0; i < array.length; i++) {
    var item = array[i];
    var type = dataTypeTest(item);
    switch (type) {
      case "string":
      case "null":
      case "number":
      case "undefined":
      case "function":
      case "boolean":
      case "symbol":
      case "set":
      case "map":
      case "json":
      case "promise":
      case "regExp":
      case "element":
        newarray.push(item);
        break;
      case "date":
        newarray.push(item.getTime());
        break;
      case "array":
        newarray.push(deepCopyArray(item));
        break;
      case "object":
        newarray.push(deepCopyObject(item));
        break;
    }
  }
  return newarray;
};
//深度复制数组/对象
export const deepCopy = function(value) {
  switch (dataTypeTest(value)) {
    case "object":
      return deepCopyObject(value);
    case "array":
      return deepCopyArray(value);
    default:
      return value;
  }
};
//根据条件过滤数组，只能过滤两种情况：一、数组里面全是对象，二、数组里面全是字符串或者其他类型的
const arrayFilterFn = function(array, property) {
  const type = dataTypeTest(property);
  return array.filter(item => {
    const itemtype = dataTypeTest(item);
    if (itemtype === "object" && type === "object") {
      let hasItem = false;
      Object.keys(property).forEach(el => {
        hasItem = item[el] === property[el];
      });
      return hasItem;
    } else {
      return item === property;
    }
  });
};
//用法一如：var arr=[{name:"水果",value:1},{name:"蔬菜",value:2}] ,arrayFilterBy(arr,{value:2})得到[{name:"蔬菜",value:2}]
//用法二如：var arr=[1,2,3,2,4,3,5,3]   arrayFilterBy(arr,3)得到 [3,3,3]
//用法三如：var arr=[{name:"水果",value:1},{name:"蔬菜",value:2},{name:"草莓",value:4}] ,arrayFilterBy(arr,[{value:2},{value:4}])得到[{name:"蔬菜",value:2},{name:"草莓",value:4}]
//用法四如：var arr=[1,2,3,2,4,3,5,3]   arrayFilterBy(arr,[3,2])得到 [3,3,3,2,2]
export const arrayFilterBy = function(array, property) {
  //property可以是{name:'zgt'}或者'zgt'
  if (!array || dataTypeTest(array) !== "array") return [];
  const type = dataTypeTest(property);
  if (type === "array") {
    let newarray = [];
    property.forEach(item => {
      newarray = newarray.concat(arrayFilterFn(array, item));
    });
    return newarray;
  } else {
    return arrayFilterFn(array, property);
  }
};
//格式时间 支持时间戳转yyyy-MM-dd HH:mm:ss格式
//支持时间戳转 yyyy-mm-dd格式 ，支持yyyy/mm/dd转yyyy-mm-dd，不支持yyyy-mm-dd转yyyy/mm/dd
export const formatDate = function(time, format) {
  if (!time) return "";
  let date = dataTypeTest(time) === "date" ? time : new Date(time);
  let ft = trim(format || "yyyy-MM-dd HH:mm:ss").split(" ");
  let newdate = "";
  let symbol = "-";
  if (!ft[0]) return;
  if (/[-]+/.test(ft[0]) && !/[/]+/.test(ft[0])) {
    symbol = "-";
  } else if (!/[-]+/.test(ft[0]) && /[/]+/.test(ft[0])) {
    symbol = "/";
  } else if (/[:]+/.test(ft[0])) {
    symbol = ":";
  }
  let addZero = function(value) {
    if (Number(value) < 10) {
      return "0" + value;
    } else {
      return value;
    }
  };
  let setTimes = function(fts, symbol) {
    let newTime = "";
    let timeFtsLen = fts.split(":").length;
    switch (timeFtsLen) {
      case 1:
        newTime += addZero(date.getHours());
        break;
      case 2:
        newTime +=
          addZero(date.getHours()) + symbol + addZero(date.getMinutes());
        break;
      default:
        newTime +=
          addZero(date.getHours()) +
          symbol +
          addZero(date.getMinutes()) +
          symbol +
          addZero(date.getSeconds());
        break;
    }
    return newTime;
  };

  if (symbol === ":") {
    newdate += setTimes(ft[0], symbol);
  } else {
    let timeFtsLen = ft[0].split(symbol).length;
    switch (timeFtsLen) {
      case 1:
        newdate += date.getFullYear();
        break;
      case 2:
        newdate += date.getFullYear() + symbol + addZero(date.getMonth() + 1);
        break;
      default:
        newdate +=
          date.getFullYear() +
          symbol +
          addZero(date.getMonth() + 1) +
          symbol +
          addZero(date.getDate());
        break;
    }

    if (ft[1]) {
      symbol = ":";
      newdate += " ";
      newdate += setTimes(ft[1], symbol);
    }
  }
  return newdate;
};

//随机产生不重复id
export const GenNonDuplicateID = function(randomLength = 8) {
  let id = Number(
    Math.random()
      .toString()
      .substr(3, randomLength) + Date.now()
  ).toString();
  return id;
};
//科学计数法转 字符串
//如 6.5E8 得 "650000000"
//如 6.5e-7得 "0.65000000"
export const EetoString = num => {
  var str = num.toString();
  var reg = /^((\d+.\d+)|(\d+))([Ee])([\-]?\d+)$/;
  var arr,
    len,
    zerod = "";

  /*6e7或6e+7 都会自动转换数值*/
  if (!reg.test(str)) {
    return num;
  } else {
    /*6e-7 需要手动转换*/
    arr = reg.exec(str);
    len = Math.abs(arr[5]) - 1;
    for (var i = 0; i < len; i++) {
      zerod += "0";
    }
    return "0." + zerod + (arr[2] ? arr[1] : arr[3]).replace(".", "");
  }
};
// 过滤一个对象中有用的的属性，permissiveKys是允许的属性名数组
export function filterQuery(permissiveKys, query) {
  const newQuery = {};
  Object.keys(query).forEach(key => {
    if (permissiveKys.includes(key)) {
      newQuery[key] = query[key];
    }
  });
  return newQuery;
}
//将url问号参数转成map对象
export const parseQueryString = function(url) {
  if (isUrl(url)) {
    const searchurl = url.split("?");
    url = searchurl.length > 1 ? "?" + searchurl[1] : searchurl[0];
  }
  var reg_url = /^\?([\w\W]+)$/;
  var reg_para = /([^&=]+)=([\w\W]*?)(&|$|#)/g,
    arr_url = reg_url.exec(url),
    ret = {};
  if (arr_url && arr_url[1]) {
    var str_para = arr_url[1],
      result;
    while ((result = reg_para.exec(str_para)) != null) {
      ret[result[1]] = result[2];
    }
  }
  return ret;
};
//检测移动端设备

export const checkDevices = function() {
  const userAgent = global.navigator.userAgent;
  if (/Android/i.test(userAgent)) {
    return "android";
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return "ios";
  } else if (/WindowsWechat/i.test(userAgent)) {
    return "WindowsWechat";
  } else if (/MicroMessenger/i.test(userAgent)) {
    return "MicroMessenger";
  }
  // const inAndroid = /Android/i.test(userAgent)
  // const inIOS = /iPhone|iPad|iPod/i.test(userAgent)
  // const inMicroMessenger = /MicroMessenger/i.test(userAgent)
  // const inWindowsWechat = /WindowsWechat/i.test(userAgent)
};

//新增

// export function fixedZero(val) {
// 	return val * 1 < 10 ? `0${val}` : val;
// }

// export function getTimeDistance(type) {
// 	const now = new Date();
// 	const oneDay = 1000 * 60 * 60 * 24;

// 	if (type === "today") {
// 		now.setHours(0);
// 		now.setMinutes(0);
// 		now.setSeconds(0);
// 		return [moment(now), moment(now.getTime() + (oneDay - 1000))];
// 	}

// 	if (type === "week") {
// 		let day = now.getDay();
// 		now.setHours(0);
// 		now.setMinutes(0);
// 		now.setSeconds(0);

// 		if (day === 0) {
// 			day = 6;
// 		} else {
// 			day -= 1;
// 		}

// 		const beginTime = now.getTime() - day * oneDay;

// 		return [moment(beginTime), moment(beginTime + (7 * oneDay - 1000))];
// 	}

// 	if (type === "month") {
// 		const year = now.getFullYear();
// 		const month = now.getMonth();
// 		const nextDate = moment(now).add(1, "months");
// 		const nextYear = nextDate.year();
// 		const nextMonth = nextDate.month();

// 		return [
// 			moment(`${year}-${fixedZero(month + 1)}-01 00:00:00`),
// 			moment(moment(`${nextYear}-${fixedZero(nextMonth + 1)}-01 00:00:00`).valueOf() - 1000),
// 		];
// 	}

// 	if (type === "year") {
// 		const year = now.getFullYear();

// 		return [moment(`${year}-01-01 00:00:00`), moment(`${year}-12-31 23:59:59`)];
// 	}
// }

// export function getPlainNode(nodeList, parentPath = "") {
// 	const arr = [];
// 	nodeList.forEach((node) => {
// 		const item = node;
// 		item.path = `${parentPath}/${item.path || ""}`.replace(/\/+/g, "/");
// 		item.exact = true;
// 		if (item.children && !item.component) {
// 			arr.push(...getPlainNode(item.children, item.path));
// 		} else {
// 			if (item.children && item.component) {
// 				item.exact = false;
// 			}
// 			arr.push(item);
// 		}
// 	});
// 	return arr;
// }

function accMul(arg1, arg2) {
  let m = 0;
  const s1 = arg1.toString();
  const s2 = arg2.toString();
  m += s1.split(".").length > 1 ? s1.split(".")[1].length : 0;
  m += s2.split(".").length > 1 ? s2.split(".")[1].length : 0;
  return (Number(s1.replace(".", "")) * Number(s2.replace(".", ""))) / 10 ** m;
}

export function digitUppercase(n) {
  const fraction = ["角", "分"];
  const digit = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const unit = [["元", "万", "亿"], ["", "拾", "佰", "仟", "万"]];
  let num = Math.abs(n);
  let s = "";
  fraction.forEach((item, index) => {
    s += (digit[Math.floor(accMul(num, 10 * 10 ** index)) % 10] + item).replace(
      /零./,
      ""
    );
  });
  s = s || "整";
  num = Math.floor(num);
  for (let i = 0; i < unit[0].length && num > 0; i += 1) {
    let p = "";
    for (let j = 0; j < unit[1].length && num > 0; j += 1) {
      p = digit[num % 10] + unit[1][j] + p;
      num = Math.floor(num / 10);
    }
    s = p.replace(/(零.)*零$/, "").replace(/^$/, "零") + unit[0][i] + s;
  }

  return s
    .replace(/(零.)*零元/, "元")
    .replace(/(零.)+/g, "零")
    .replace(/^整$/, "零元整");
}

/* eslint no-useless-escape:0 */
const reg = /(((^https?:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+(?::\d+)?|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w\?\=\&]*))?)$/;

export function isUrl(path) {
  return reg.test(path);
}
const startHttpReg = /^(http:|https:)[\w\?\&\.\#\%\*\@\$\!\~\/]*/;
export function isHttpStart(path) {
  return startHttpReg.test(path);
}

// 将从后台获取的导航数据转成route的需要的key
export function formatterMapKey(
  data,
  mapKey = {},
  parentPath = "/",
  notParPath = false
) {
  // const notParPath = typeof parentPath == "boolean" && !parentPath;
  mapKey = Object.assign(
    {
      iconClass: "iconClass",
      path: "path",
      name: "name",
      children: "children"
    },
    mapKey ? mapKey : {}
  );
  return data.map(item => {
    let path = item[mapKey.path];
    if (!notParPath && !isHttpStart(path))
      path = parentPath + path.replace(/^\/*/, "");
    const newData = {
      ...item,
      iconClass:
        item[mapKey.iconClass] !== undefined
          ? item[mapKey.iconClass]
          : "smile-o",
      path,
      parPath: parentPath.replace(/\/$/, ""),
      name: item[mapKey.name]
    };
    if (Array.isArray(item[mapKey.children]) && item[mapKey.children].length) {
      newData[mapKey.children] = formatterMapKey(
        item[mapKey.children],
        mapKey,
        `${path}/`,
        notParPath
      );
    }
    return newData;
  });
}

export function itemsFromTree({
  tree,
  sourceItem,
  item,
  keyObj,
  action,
  parentItem,
  condition
}) {
  let finished = false;
  keyObj = dataType.isObject(keyObj)
    ? keyObj
    : { id: "id", children: "children" };
  for (let index = 0; index < tree.length; index++) {
    const currentItem = tree[index];
    if (
      dataType.isFunction(condition)
        ? condition(currentItem[keyObj.id], sourceItem[keyObj.id])
        : currentItem[keyObj.id] === sourceItem[keyObj.id]
    ) {
      dataType.isFunction(action) &&
        action({ tree, currentItem, item, index, keyObj, parentItem });
      finished = true;
    } else if (Array.isArray(currentItem[keyObj.children])) {
      finished = itemsFromTree({
        tree: currentItem[keyObj.children],
        sourceItem,
        item,
        keyObj,
        action,
        parentItem: currentItem
      });
    }
    if (finished) break;
  }
  return finished;
}
/**
 *用于移除json中一项数据
 *
 * @export
 * @param {object} obj { tree:array, sourceItem:object, keyObj:{id:"id",children:"children"} }
 * @returns
 */
export function removeItemFromTree(obj) {
  // { tree, sourceItem, keyObj }
  const newobj = deepCopy(obj);
  newobj.action = function({ tree, currentItem, index, keyObj }) {
    tree.splice(index, 1);
  };
  if (itemsFromTree(newobj)) {
    return newobj.tree;
  }
}
/**
 *用item数据替换json中一项sourceItem数据
 *
 * @export
 * @param {object} obj { tree:array, sourceItem:object,item:object, keyObj:{id:"id",children:"children"} }
 * @returns
 */
export function replaceItemFromTree(obj) {
  const newobj = deepCopy(obj);
  newobj.action = function({ tree, currentItem, item, index, keyObj }) {
    tree.splice(index, 1, item);
  };
  if (itemsFromTree(newobj)) {
    return newobj.tree;
  }
}
/**
 *用于json中某项sourceItem数据的children末端添加一项item数据
 *
 * @export
 * @param {object} obj { tree:array, sourceItem:object,item:object, keyObj:{id:"id",children:"children"} }
 * @returns
 */
export function pushItemToTree(obj) {
  const newobj = deepCopy(obj);
  newobj.action = function({ tree, currentItem, item, index, keyObj }) {
    if (!Array.isArray(currentItem[keyObj.children])) {
      currentItem[keyObj.children] = [];
    }
    currentItem[keyObj.children].push(item);
  };
  if (itemsFromTree(newobj)) {
    return newobj.tree;
  }
}
/**
 *用于json中某项sourceItem数据的children头端添加一项item数据
 *
 * @export
 * @param {object} obj { tree:array, sourceItem:object,item:object, keyObj:{id:"id",children:"children"} }
 * @returns
 */
export function unshiftItemToTree(obj) {
  const newobj = deepCopy(obj);
  newobj.action = function({ tree, currentItem, item, index, keyObj }) {
    if (!Array.isArray(currentItem[keyObj.children])) {
      currentItem[keyObj.children] = [];
    }
    currentItem[keyObj.children].unshift(item);
  };
  if (itemsFromTree(newobj)) {
    return newobj.tree;
  }
}
/**
 *用于将一项item数据插入在json中某项sourceItem数据之前
 *
 * @export
 * @param {object} obj { tree:array, sourceItem:object,item:object, keyObj:{id:"id",children:"children"} }
 * @returns
 */
export function insertBeforeItemFromTree(obj) {
  const newobj = deepCopy(obj);
  newobj.action = function({ tree, currentItem, item, index, keyObj }) {
    tree.splice(index, 0, item);
  };
  if (itemsFromTree(newobj)) {
    return newobj.tree;
  }
}
/**
 *用于将一项item数据插入在json中某项sourceItem数据之后
 *
 * @export
 * @param {object} obj { tree:array, sourceItem:object,item:object, keyObj:{id:"id",children:"children"} }
 * @returns
 */
export function insertAfterItemFromTree(obj) {
  const newobj = deepCopy(obj);
  newobj.action = function({ tree, currentItem, item, index, keyObj }) {
    tree.splice(index + 1, 0, item);
  };
  if (itemsFromTree(newobj)) {
    return newobj.tree;
  }
}
//判断是白色颜色值
export function isWhiteColor(str) {
  return (
    typeof str === "string" &&
    (str.search(/^\#(f{3}$|f{6}$)/i) > -1 ||
      str.search(/^rgb(a)?\(255,255,255/) > -1)
  );
}

/**
 * @description: 转换tree数据的键名
 * @param tree {array}
 * @param srcMapKeys {object} 默认 { label: "label", value: "value", children: "children" },
 * @param distMapKeys {object} 默认 { label: "label", value: "value", children: "children" }
 * @param extands {object} 默认 {}  可以在tree中加入定义的字段
 * @param valueToString {boolean} 默认 false 是否把 value (有可能是数字) 转成 string 类型的
 * @param includesSourceItem {boolean} 默认 false  除了label，value字段，是否保留tree中的其他字段
 * @return: newTree
 */
export function turnMapKeys(
  tree,
  srcMapKeys = { label: "label", value: "value", children: "children" },
  distMapKeys = { label: "label", value: "value", children: "children" },
  extands = {},
  valueToString,
  includesSourceItem
) {
  return Array.isArray(tree)
    ? tree.map(item => {
		const children = item[srcMapKeys.children];
		const sourceItem=(includesSourceItem ? item : {});
		delete sourceItem[srcMapKeys.children];
        const newItem = {
          ...sourceItem,
          [distMapKeys.label]: item[srcMapKeys.label],
          [distMapKeys.value]:
            valueToString &&
            item[srcMapKeys.value] !== null &&
            item[srcMapKeys.value] !== undefined
              ? item[srcMapKeys.value].toString()
              : item[srcMapKeys.value],
          ...extands
        };
        if (children) {
          newItem[distMapKeys.children] = turnMapKeys(
            children,
            srcMapKeys,
            distMapKeys,
            valueToString,
            includesSourceItem
          );
        }
        return newItem;
      })
    : [];
}
/**
 * @description:
 * @param tree {array}
 * @param value {string|array|number}
 * @param toDist {object}  默认 ： { src: "value", dist: "label" }  意思》将value值取tree对应的 label
 * @return: newValueArr
 */
export function turnLabelOrValue(
  tree,
  value,
  toDist = { src: "value", dist: "label" },
  parValueArr
) {
  const newValueArr = parValueArr || [];
  if (Array.isArray(tree)) {
    tree.forEach(item => {
      if (Array.isArray(value)) {
        const index = value.indexOf(item[toDist.src]);
        if (index > -1 && !newValueArr[index]) {
          newValueArr[index] = item[toDist.dist];
        }
      } else if (value === item[toDist.src]) {
        newValueArr[0] = item[toDist.dist];
      }
      if (item.children) {
        turnLabelOrValue(item.children, value, toDist, newValueArr);
      }
    });
  }
  return Array.isArray(value) ? newValueArr : newValueArr[0];
}

export const zTool = {
  getStyle,
  setStyle,
  hasClass,
  addClass,
  removeClass,
  on,
  off,
  once,
  dataTypeTest,
  deepCopyObject,
  deepCopyArray,
  deepCopy,
  formatDate,
  GenNonDuplicateID,
  arrayFilterBy,
  EetoString,
  onNoRepeatEvent,
  filterQuery,
  parseQueryString,
  formatterMapKey,
  isUrl,
  checkDevices,
  loadFileList,
  dataType,
  firstWordToUpperCase,
  removeItemFromTree,
  replaceItemFromTree,
  pushItemToTree,
  itemsFromTree,
  isWhiteColor,
  turnMapKeys,
  turnLabelOrValue
};
export default zTool;
