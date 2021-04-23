//index.js
import { wxAsyncPromise } from '../index';
import { getDeviceCharacteristics } from '../bluetoolth';
const errMsg = {
    10000: '未初始化蓝牙模块',
    10001: '蓝牙未打开，请打开蓝牙后下拉刷新',
    10002: '没有找到指定设备',
    10003: '连接失败',
    10004: '没有找到指定服务',
    10005: '没有找到指定特征值',
    10006: '当前连接已断开',
    10007: '当前特征值不支持此操作',
    10008: '其余所有系统上报的异常',
    10009: 'Android系统特有，系统版本低于 4.3 不支持 BLE',
    10012: '连接超时',
    10013: '连接 deviceId 为空或者是格式不正确',
    '-1': '设备已被连接',
};

function debounce(func, wait) {
    let timer = null;
    return function (opt) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func && func.call(this, opt);
        }, wait || 60);
    };
}

export default function getBluetoothPageConfig() {
    return {
        data: {
            devices: [],
            deviceName: '',
            deviceId: '',
            connection: 0,
            printTitle: '',
        },
        onHide() {
            wx.offBluetoothDeviceFound(this.onFoundDevice);
            wxAsyncPromise('stopBluetoothDevicesDiscovery').catch((res) => {
                this.toastFailErrorMsg(res);
            });
        },
        onLoad(options) {
            this.openBlue();
            // //初始化蓝牙
            // wxAsyncPromise('openBluetoothAdapter')
            //     .then(() => {
            //         wx.startPullDownRefresh();
            //     })
            //     .catch((res) => {
            //         this.toastFailErrorMsg(res);
            //     });
        },
        onUnload() {
            //取消蓝牙连接并关闭蓝牙模块
            wxAsyncPromise('closeBLEConnection', {
                deviceId: this.data.deviceId,
            })
                .catch((res) => {
                    this.toastFailErrorMsg(res);
                })
                .finally((res) => {
                    wxAsyncPromise('closeBluetoothAdapter').catch((res) => {
                        this.toastFailErrorMsg(res);
                    });
                });
        },
        onPullDownRefresh() {
            this.wuxToptipsHide && this.wuxToptipsHide();
            //下拉刷新
            this.searchBlue();
        },
        methods: {
            //提示错误信息
            toastFailErrorMsg(res) {
                this.wuxToptipsHide && this.wuxToptipsHide();
                const coode = res && res.errCode ? res.errCode.toString() : '';
                const msg = errMsg[coode];
                const wuxToptips = this.selectComponent('#wux-toptips');
                this.wuxToptipsHide = wuxToptips.error({
                    hidden: true,
                    text: (msg || coode || res || '').toString(),
                    duration: 3000,
                    // success() {},
                });
                wx.hideLoading();
                wx.stopPullDownRefresh();

                console.error(res);
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
            onFoundDevice: debounce(function (devices) {
                //获取搜寻的所有设备
                wxAsyncPromise('getBluetoothDevices').then((res) => {
                    this.setData({
                        devices: this.getNewDevicesList(res.devices),
                    });
                    if (this.data.devices.length) {
                        wx.stopPullDownRefresh();
                        wx.hideLoading();
                    }
                });
            }, 60),
            openBlue() {
                //初始化蓝牙模块
                this.onSearchDeviceFound(wxAsyncPromise('openBluetoothAdapter'));
            },
            onSearchDeviceFound(pro) {
                pro.then((res) => {
                    wx.showLoading({
                        title: '初始化蓝牙成功',
                        mask: false,
                    });
                    return wxAsyncPromise('startBluetoothDevicesDiscovery').then((res) => {
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
                        this.toastFailErrorMsg(res);
                    });
            },
            //取消连接
            cancelConnection() {
                wxAsyncPromise('closeBLEConnection', {
                    deviceId: this.data.deviceId,
                })
                    .then((res) => {
                        this.setData({
                            deviceId: '',
                            connection: 0,
                            deviceName: '',
                        });
                    })
                    .catch((res) => {
                        this.toastFailErrorMsg(res);
                    });
            },
            //重新搜索蓝牙设备
            searchBlue() {
                this.setData({
                    devices: [],
                    deviceId: '',
                    connection: 0,
                    deviceName: '',
                });
                //先取消连接
                wxAsyncPromise('closeBLEConnection', {
                    deviceId: this.data.deviceId,
                }).finally((res) => {
                    //取消监听寻找到新设备的事件
                    wx.offBluetoothDeviceFound(this.onFoundDevice);
                    //停止搜寻蓝牙
                    wxAsyncPromise('stopBluetoothDevicesDiscovery')
                        .then(() => {
                            wx.getBluetoothAdapterState({
                                success: (res) => {
                                    if (!res.available) {
                                        const wuxToptips = this.selectComponent('#wux-toptips');
                                        this.wuxToptipsHide = wuxToptips.error({
                                            hidden: true,
                                            text: '蓝牙适配器不可用，请检查是否打开蓝牙',
                                            duration: 3000,
                                            // success() {},
                                        });
                                    } else if (!res.discovering) {
                                        //没有在搜寻蓝牙情况
                                        this.onSearchDeviceFound(Promise.resolve());
                                    }
                                },
                                fail: (res) => {
                                    if (res.errCode === 10000) {
                                        this.openBlue();
                                    } else {
                                        this.toastFailErrorMsg(res);
                                    }
                                },
                            });
                        })
                        .catch((res) => {
                            this.toastFailErrorMsg(res);
                        });
                });
            },

            //选择蓝牙设备连接
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
                                wxAsyncPromise('stopBluetoothDevicesDiscovery').catch((res) => {
                                    this.toastFailErrorMsg(res);
                                });
                            },
                            (res) => {
                                this.toastFailErrorMsg(res);
                                this.setData({
                                    connection: 0,
                                });
                                wx.hideLoading();
                            },
                        );
                    })
                    .catch((res) => {
                        this.toastFailErrorMsg(res);
                        this.setData({
                            connection: 0,
                        });
                        wx.hideLoading();
                    });
            },
        },
    };
}
