/*
 * @Author: zgt
 * @Date: 2019-07-26 16:12:37
 * @LastEditors: zgt
 * @LastEditTime: 2019-10-18 18:49:24
 * @Description: file content
 */
import { wxAsyncPromise } from './index';

//微信小程序向蓝牙打印机发送数据进行打印的坑：
//小程序api向蓝牙打印机发送数据打印，发送的任何内容都应该要转成二进制数据，而且蓝牙打印的文本编码是GBK的，发送中文需转成GBK编码再转成二进制数据发送
//发送打印机指令也要转成二进制数据发送
//蓝牙打印机一次接收的二级制数据有限制，不同的系统不同的蓝牙设备限制可能不同，微信建议一次20个字节，需做递归分包发送
//发送完要打印的内容后，一定要发送一个打印的指令才能顺利打印 （有些指令就不需要）

//一、初始化蓝牙、开始检索蓝牙设备
export function openBlue() {
    return wxAsyncPromise('openBluetoothAdapter').then((res) => {
        console.log('初始化蓝牙成功', res);
        return wxAsyncPromise('startBluetoothDevicesDiscovery').then((res) => {
            console.log('正在搜寻蓝牙设备', res);
        });
    });
}
//二、
/**
 *
 *
 * @export
 * @param {function} getDevices wx.getBluetoothDevices的监听回调函数
 */
export function onfindBlueDevices(getDevices) {
    //监听寻找到新设备的事件
    wx.onBluetoothDeviceFound(function (devices) {
        //获取在蓝牙模块生效期间所有已发现的蓝牙设备
        wxAsyncPromise('getBluetoothDevices').then((res) => {
            getDevices && getDevices(res.devices);
        });
    });
}

//三、连接蓝牙设备
// wxAsyncPromise("createBLEConnection",{deviceId:""}).then(res=>{
//连接成功可选择停止搜索蓝牙
// wxAsyncPromise("stopBluetoothDevicesDiscovery").then()
// }).catch(res=>{}).finally(()=>{})

//四、连接成功后， 获取蓝牙设备的service服务
// wxAsyncPromise("getBLEDeviceServices",{deviceId:""}).then(res=>{})

//五、获取的service服务可能有多个，递归获取特征值（最后要用的是能读，能写，能监听的那个值的uuid作为特征值id）
/**
 *
 *
 * @export
 * @param {number} deviceId 蓝牙设备id
 * @param {array} services wxAsyncPromise("getBLEDeviceServices",{deviceId:""}).then(res=>{})获取的res.services
 * @param {function} success 成功取得有用特征值uuid的回调函数
 */
export function getDeviceCharacteristics(deviceId, services = [], success, fail) {
    services = services.slice(0);
    if (services.length) {
        const serviceId = services.shift().uuid;
        wxAsyncPromise('getBLEDeviceCharacteristics', {
            deviceId,
            serviceId,
        })
            .then((res) => {
                console.log('getBLEDeviceCharacteristics', deviceId, serviceId, res);
                let finished = false;
                let write = false;
                let notify = false;
                let indicate = false;
                for (var i = 0; i < res.characteristics.length; i++) {
                    if (!notify) {
                        notify = res.characteristics[i].properties.notify;
                    }
                    if (!indicate) {
                        indicate = res.characteristics[i].properties.indicate;
                    }
                    if (!write) {
                        write = res.characteristics[i].properties.write;
                    }
                    if ((notify || indicate) && write) {
                        /* 获取蓝牙特征值uuid */
                        success &&
                            success({
                                serviceId,
                                characteristicId: res.characteristics[i].uuid,
                            });
                        finished = true;
                        break;
                    }
                }

                if (!finished) {
                    getDeviceCharacteristics(deviceId, services, success, fail);
                }
            })
            .catch((res) => {
                getDeviceCharacteristics(deviceId, services, success, fail);
            });
    } else {
        fail && fail();
    }
}

//六、启动notify 蓝牙监听功能 然后使用 wx.onBLECharacteristicValueChange用来监听蓝牙设备传递数据
/**
 *
 *
 * @export
 * @param {object} options
 * {
            deviceId,
            serviceId,
            characteristicId,
    }
 * @param {function} onChange 监听蓝牙设备传递数据回调函数
 */
export function onBLECharacteristicValueChange(options, onChange = function () {}) {
    wxAsyncPromise('notifyBLECharacteristicValueChange', {
        state: true,
        ...options,
    }).then((res) => {
        wx.onBLECharacteristicValueChange(onChange);
    });
}

//七、发送数据(递归分包发送)
/**
 *
 *
 * @export
 * @param {object} options
 * {
            deviceId,
            serviceId,
            characteristicId,
			value [ArrayBuffer],
			lasterSuccess,
    }
 */

export function sendDataToDevice(options) {
    let byteLength = options.value.byteLength;
    //这里默认一次20个字发送
    const speed = options.onceByleLength || 20;
    if (byteLength > 0) {
        wxAsyncPromise('writeBLECharacteristicValue', {
            ...options,
            value: options.value.slice(0, byteLength > speed ? speed : byteLength),
        })
            .then((res) => {
                if (byteLength > speed) {
                    sendDataToDevice({
                        ...options,
                        value: options.value.slice(speed, byteLength),
                    });
                } else {
                    options.lasterSuccess && options.lasterSuccess();
                }
            })
            .catch((res) => {
                options.onError && options.onError(res);
            });
    }
}
export function charToArrayBuffer(str) {
    var out = new ArrayBuffer(str.length);
    var uint8 = new Uint8Array(out);
    var strs = str.split('');
    for (var i = 0; i < strs.length; i++) {
        uint8[i] = strs[i].charCodeAt();
    }
    return uint8;
}
export function charToArray(str) {
    var arr = [];
    var strs = str.split('');
    for (var i = 0; i < strs.length; i++) {
        arr[i] = strs[i].charCodeAt();
    }
    return arr;
}

// 使用的 ESC/POS指令， 十进制方式
// 更多指令请查看 ./PrintCommandDocs/ESC-POS指令文档(凯盛诺打印机代表).pdf

export const printCommand = {
    left: [27, 97, 0], //居左
    center: [27, 97, 1], //居中
    right: [27, 97, 2], //居右
    clear: [27, 64], //初始化
    enter: [10],
};

//打印二维码
/**
 *
 *
 * @export
 * @param {object} options
 * {
            deviceId,
            serviceId,
            characteristicId,
            value,//ArrayBuffer:二维码的数据
    }
 */
export function printQR(options) {
    //打印二维码的十进制指令data：
    let data = [...printCommand.clear, 29, 107, 97, 7, 4, options.value.byteLength, 0];
    sendDataToDevice({
        ...options,
        value: new Uint8Array(data).buffer,
        lasterSuccess: () => {
            //指令发送成功后，发送二维码的数据
            sendDataToDevice(options);
        },
    });
}

function grayPixle(pix) {
    return pix[0] * 0.299 + pix[1] * 0.587 + pix[2] * 0.114;
}
/**
 * overwriteImageData
 * @param {object} data
 * {
            width,//图片宽度
            height,//图片高度
            imageData,//Uint8ClampedArray
            threshold,//阈值
    }
 */
export function overwriteImageData(data) {
    let sendWidth = data.width,
        sendHeight = data.height;
    const threshold = data.threshold || 180;
    let sendImageData = new ArrayBuffer((sendWidth * sendHeight) / 8);
    sendImageData = new Uint8Array(sendImageData);
    let pix = data.imageData;
    const part = [];
    let index = 0;
    for (let i = 0; i < pix.length; i += 32) {
        //横向每8个像素点组成一个字节（8位二进制数）。
        for (let k = 0; k < 8; k++) {
            const grayPixle1 = grayPixle(pix.slice(i + k * 4, i + k * 4 + (4 - 1)));
            //阈值调整
            if (grayPixle1 > threshold) {
                //灰度值大于128位   白色 为第k位0不打印
                part[k] = 0;
            } else {
                part[k] = 1;
            }
        }
        let temp = 0;
        for (let a = 0; a < part.length; a++) {
            temp += part[a] * Math.pow(2, part.length - 1 - a);
        }
        //开始不明白以下算法什么意思，了解了字节才知道，一个字节是8位的二进制数，part这个数组存的0和1就是二进制的0和1，传输到打印的位图数据的一个字节是0-255之间的十进制数，以下是用相权相加法转十进制数，理解了这个就用上面的for循环替代了
        // const temp =
        //   part[0] * 128 +
        //   part[1] * 64 +
        //   part[2] * 32 +
        //   part[3] * 16 +
        //   part[4] * 8 +
        //   part[5] * 4 +
        //   part[6] * 2 +
        //   part[7] * 1;
        sendImageData[index++] = temp;
    }
    return {
        array: Array.from(sendImageData),
        width: sendWidth / 8,
        height: sendHeight,
    };
}

export function printImage(opt = {}, imageInfo = {}) {
    const { printAlign = 'left' } = opt;
    let arr = imageInfo.array,
        width = imageInfo.width;
    const writeArray = [];
    const xl = width % 256;
    const xh = width / 256;
    //分行发送图片数据
    const command = []
        .concat(printCommand.clear)
        .concat(printCommand[printAlign])
        .concat([29, 118, 48, 0, xl, xh, 1, 0]);
    for (let i = 0; i < arr.length / width; i++) {
        const subArr = arr.slice(i * width, i * width + width);
        const tempArr = command.concat(subArr);
        writeArray.push(new Uint8Array(tempArr));
    }
    const len = writeArray.length;
    const print = (options, writeArray) => {
        if (writeArray.length) {
            sendDataToDevice({
                ...options,
                value: writeArray.shift().buffer,
                lasterSuccess: () => {
                    options.onProgress && options.onProgress(Math.floor(((len - writeArray.length) / len) * 100));
                    if (writeArray.length) {
                        print(options, writeArray);
                    } else {
                        options.lasterSuccess && options.lasterSuccess();
                    }
                },
            });
        }
    };
    print(opt, writeArray);
}
