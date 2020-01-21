//index.js
import { wxAsyncPromise } from '../../wx-weapp-tool/index';
import {
    getDeviceCharacteristics,
    printImage,
    sendDataToDevice,
    overwriteImageData,
    printQR,
} from '../../wx-weapp-tool/bluetoolth';

import GBK from '../../wx-weapp-tool/libs/gbk.min';
const errMsg = {
    10000: '未初始化蓝牙模块',
    10001: '蓝牙未打开',
};

function debounce(func, wait) {
    let timer = null;
    return function(opt) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func && func.call(this, opt);
        }, wait || 60);
    };
}

Page({
    data: {
        devices: [],
        deviceName: '',
        deviceId: '',
        connection: 0,
        canvasWidth: 100,
        canvasHeight: 50,
        message: `【2019】
        当事人姓名：获取当事人姓名
        年龄：获取当事人年龄
        你（单位）于___年___月___日___时___分在___________________因____________________________的行为，违反了__________________________________的规定，有证据___________________
        现责令你（单位）于_______年______月______日    _______时前自行__________________________                    
        现依据___________________________的规定、本局决定对你（单位）处以下行政处罚：                    
        警告；
        罚款人民币伍拾元整。￥:【50元】 缴纳罚款方式：
        当场收缴。（依据《中华人民共和国行政处罚法》第四十七条、第四十八条的规定）
        自收到本决定书之日起15日内将）罚款交至____银行（账  号：                  )。逾期未缴纳罚款的，可以每日按罚款数额的3%加处罚款。
        本局执法人员当场向你（单位）告知了违法事实、依据和依法享有的权利。陈述申辩情况：                                                          
        我于___年___月___日收到本处罚决定书、执法人员在处罚前已向我告知了权利，并听取了我的陈述和申辩。
        送达方式：___________________________________
        当事人签名：
        年     月      日`,
        checked: true,
    },
    onHide() {
        wx.offBluetoothDeviceFound(this.onFoundDevice);
        wxAsyncPromise('stopBluetoothDevicesDiscovery');
        // console.log("停止搜索蓝牙设备");
    },
    onLoad() {
        this.openBlue();
    },
    onUnload() {
        //取消蓝牙连接并关闭蓝牙模块
        wxAsyncPromise('closeBLEConnection', {
            deviceId: this.data.deviceId,
        }).finally((res) => {
            wxAsyncPromise('closeBluetoothAdapter');
        });
    },
    onPullDownRefresh() {
        //下拉刷新
        this.searchBlue();
    },
    //获取设备列表
    getNewDevicesList(devices) {
        const ids = [];
        //过滤
        const devs = devices
            .filter((item) => !(item.RSSI > 0 || item.name == '未知设备'))
            .map((item) => {
                ids.push(item.deviceId);
                return {
                    rssi: item.RSSI,
                    name: item.name,
                    devId: item.deviceId,
                };
            });
        //过滤重复
        const filterId = [...new Set(ids)];
        const newDevices = [];
        while (filterId.length) {
            const id = filterId.shift();
            for (let index = 0; index < devs.length; index++) {
                const item = devs[index];
                if (item.devId === id) {
                    newDevices.push(item);
                    break;
                }
            }
        }
        return newDevices;
    },
    onFoundDevice: debounce(function(devices) {
        //获取搜寻的所有设备
        wxAsyncPromise('getBluetoothDevices').then((res) => {
            this.setData({
                devices: this.getNewDevicesList(res.devices),
            });
        });
    }, 60),
    openBlue() {
        this.onSearchDeviceFound(wxAsyncPromise('openBluetoothAdapter'));
    },
    onSearchDeviceFound(pro) {
        pro.then((res) => {
            console.log('初始化蓝牙成功');
            return wxAsyncPromise('startBluetoothDevicesDiscovery').then((res) => {
                console.log('正在搜寻设备');
                wx.showLoading({
                    title: '正在搜寻设备',
                    mask: false,
                });
            });
        })
            .then((res) => {
                //监听寻找新设备
                wx.onBluetoothDeviceFound(this.onFoundDevice);
            })
            .catch((res) => {
                const coode = res.errCode ? res.errCode.toString() : '';
                const msg = errMsg[coode];
                wx.showToast({
                    title: msg || coode,
                    icon: 'none',
                });
            })
            .finally(() => {
                setTimeout(() => {
                    wx.hideToast();
                }, 300);
                wx.stopPullDownRefresh();
            });
    },
    cancelConnection() {
        wxAsyncPromise('closeBLEConnection', {
            deviceId: this.data.deviceId,
        }).then((res) => {
            this.setData({
                deviceId: '',
                connection: 0,
                deviceName: '',
            });
        });
    },
    //重新搜索蓝牙设备
    searchBlue() {
        wxAsyncPromise('closeBLEConnection', {
            deviceId: this.data.deviceId,
        }).finally((res) => {
            this.setData({
                devices: [],
                deviceId: '',
                connection: 0,
                deviceName: '',
            });
            wx.offBluetoothDeviceFound(this.onFoundDevice);
            //停止搜寻蓝牙
            wxAsyncPromise('stopBluetoothDevicesDiscovery').then(() => {
                wx.getBluetoothAdapterState({
                    success: (res) => {
                        if (!res.available) {
                            //未打开蓝牙
                        } else if (!res.discovering) {
                            //没有在搜寻蓝牙情况
                            this.onSearchDeviceFound(Promise.resolve());
                        }
                    },
                    fail: (res) => {
                        if (res.errCode === 10000) {
                            this.openBlue();
                        }
                    },
                });
            });
        });
    },
    checkedChange(e) {
        this.setData({ checked: e.detail.value });
    },
    //连接蓝牙
    connectBlue(deviceId) {
        // const deviceId = this.data.deviceId;
        const selectDevice = this.data.devices.find((item) => item.devId === deviceId);
        const deviceName = selectDevice.name;
        wx.showLoading({
            title: `正在连接${deviceName}`,
            mask: true,
        });
        wxAsyncPromise('createBLEConnection', { deviceId })
            .then((res) => {
                return wxAsyncPromise('getBLEDeviceServices', { deviceId });
            })
            .then((res) => {
                this.services = res.services;
                console.log('服务', this.services);
                getDeviceCharacteristics(
                    deviceId,
                    [...this.services],
                    (character) => {
                        console.log(character);
                        this.character = character;

                        this.setData({
                            connection: 1,
                            deviceName: selectDevice.name,
                            deviceId,
                        });
                        wx.hideLoading();
                        wx.offBluetoothDeviceFound(this.onFoundDevice);
                        wxAsyncPromise('stopBluetoothDevicesDiscovery');
                    },
                    (res) => {
                        console.log('连接失败', res);
                        this.setData({
                            connection: 0,
                        });
                        wx.hideLoading();
                    },
                );
            })
            .catch((res) => {
                console.log('连接失败', res);
                this.setData({
                    connection: 0,
                });
                wx.hideLoading();
            });
    },
    onBlueChange(e) {
        const deviceId = e.detail.value;
        if (this.data.deviceId === deviceId) return;
        this.setData({
            deviceId: '',
            connection: 0,
            deviceName: '',
        });
        this.connectBlue(deviceId);
    },
    inputChange(e) {
        console.log(e);
        this.setData({
            message: e.detail.value,
        });
    },
    print() {
        if (!this.data.deviceId) {
            wx.showToast({
                title: '未连接任何蓝牙设备',
                icon: 'none',
            });
            return;
        }
        const opt = { deviceId: this.data.deviceId, ...this.character };
        sendDataToDevice({
            ...opt,
            value: new Uint8Array(GBK.encode(this.data.message)).buffer,
            lasterSuccess: () => {
                // 打印二维码
                if (this.data.checked) {
                    printQR({
                        ...opt,
                        value: new Uint8Array(GBK.encode('https://www.baidu.com/')).buffer,
                    });
                }
            },
        });
    },
    clearCanvas() {
        const ctx = wx.createCanvasContext('secondCanvas');
        ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasWidth);
        ctx.draw();
        this.setData({
            canvasWidth: 100,
            canvasHeight: 50,
        });
    },
    chooseImage() {
        if (!this.data.deviceId) {
            wx.showToast({
                title: '未连接任何蓝牙设备',
                icon: 'none',
            });
            return;
        }
        const ctx = wx.createCanvasContext('secondCanvas');
        //选择一张图片
        wx.chooseImage({
            success: (res) => {
                const temppath = res.tempFilePaths[0];
                //获取图片的宽高信息
                wx.getImageInfo({
                    src: temppath,
                    success: (res) => {
                        //纸张宽度384px
                        const w = 384;
                        const h = (res.height * w) / res.width;
                        this.setData(
                            {
                                canvasHeight: h,
                                canvasWidth: w,
                            },
                            () => {
                                //canvas 画一张图片
                                ctx.drawImage(temppath, 0, 0, w, h);
                                ctx.draw();
                                setTimeout(() => {
                                    //获取画布里的图片数据
                                    wx.canvasGetImageData({
                                        canvasId: 'secondCanvas',
                                        x: 0,
                                        y: 0,
                                        width: w,
                                        height: h,
                                        success: (res) => {
                                            const pix = res.data;
                                            const opt = { deviceId: this.data.deviceId, ...this.character };
                                            const sendImageinfo = overwriteImageData({
                                                imageData: pix,
                                                width: w,
                                                height: h,
                                                threshold: 190,
                                            });
                                            console.log(sendImageinfo);
                                            //打印图片
                                            printImage(opt, sendImageinfo);
                                        },
                                    });
                                }, 100);
                            },
                        );
                    },
                });
            },
        });
    },
});
