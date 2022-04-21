//index.js
import {
    printImage,
    sendDataToDevice,
    overwriteImageData,
    printQR,
    printCommand,
} from '../../wx-weapp-tool/bluetoolth';

import GBK from '../../wx-weapp-tool/libs/gbk.min';

import getBluetoothPageConfig from '../../wx-weapp-tool/bluetoothConnectionTemplate/index';
const bluetoothConfig = getBluetoothPageConfig();

Page({
    data: {
        ...bluetoothConfig.data,
        // 打印机纸张宽度，我用的打印几的纸张最大宽度是384，可以修改其他的
        paperWidth: 384,
        canvasWidth: 1,
        canvasHeight: 1,
        img: '',
        threshold: [200],
        percentage: 0,
        printing: false,
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
        bluetoothConfig.onHide.call(this);
    },
    onLoad(options) {
        bluetoothConfig.onLoad.call(this, options);
    },
    onUnload() {
        bluetoothConfig.onUnload.call(this);
    },
    onPullDownRefresh() {
        bluetoothConfig.onPullDownRefresh.call(this);
    },
    ...bluetoothConfig.methods,
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
            value: new Uint8Array([...printCommand.clear, ...GBK.encode(this.data.message), ...printCommand.enter])
                .buffer,
            lasterSuccess: () => {
                // 用指令打印二维码
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
            canvasWidth: 1,
            canvasHeight: 1,
            img: '',
        });
    },
    chooseImage() {
        const ctx = wx.createCanvasContext('secondCanvas');
        //选择一张图片
        wx.chooseImage({
            success: (res) => {
                const tempFilePath = res.tempFilePaths[0];
                wx.getImageInfo({
                    src: tempFilePath,
                    success: (res) => {
                        // 打印宽度须是8的整数倍，这里处理掉多余的，使得宽度合适，不然有可能乱码
                        const mw = this.data.paperWidth % 8;
                        const w = mw === 0 ? this.data.paperWidth : this.data.paperWidth - mw;
                        // 等比算出图片的高度
                        const h = Math.floor((res.height * w) / res.width);
                        // 设置canvas宽高
                        this.setData({
                            img: tempFilePath,
                            canvasHeight: h,
                            canvasWidth: w,
                        });
                        // 在canvas 画一张图片
                        ctx.fillStyle = 'rgba(255,255,255,1)';
                        ctx.clearRect(0, 0, w, h);
                        ctx.fillRect(0, 0, w, h);
                        ctx.drawImage(tempFilePath, 0, 0, w, h);
                        ctx.draw(false, () => {
                            wx.hideLoading();
                        });
                    },
                    fail: (res) => {
                        console.log('get info fail', res);
                        wx.hideLoading();
                    },
                });
            },
        });
    },

    handleSlider(e) {
        const { value } = e.detail;

        this.setData({
            threshold: value,
        });
    },
    printImage() {
        if (!this.data.deviceId) {
            wx.showToast({
                title: '未连接任何蓝牙设备',
                icon: 'none',
            });
            return;
        }
        if (this.lock === true) {
            console.log('lock');
            return;
        }
        this.lock = true;
        // 选择一张图片
        const { img } = this.data;
        if (!img) {
            wx.showToast({
                title: '未获取图片',
                icon: 'none',
            });
            this.lock = false;
            return;
        }
        const { canvasWidth, canvasHeight, deviceId, threshold } = this.data;
        console.log('threshold', threshold);
        //获取画布里的图片数据
        wx.canvasGetImageData({
            canvasId: 'secondCanvas',
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
            success: (res) => {
                const pix = res.data;
                const opt = {
                    deviceId,
                    ...this.character,
                    onProgress: (percentage) => {
                        console.log('percentage', percentage);
                        this.setData({
                            percentage,
                        });
                    },
                    lasterSuccess: () => {
                        console.log('laster success');
                        this.setData({
                            printing: false,
                            percentage: 0,
                        });
                        wx.showModal({
                            title: '提示',
                            content: '数据已发送完，请检查打印的内容是否正常',
                            showCancel: false,
                            confirmText: '好的',
                        });
                    },
                };
                this.setData({
                    printing: true,
                });
                //打印图片
                printImage(
                    opt,
                    // 将图片数据转成位图数据
                    overwriteImageData({
                        threshold: threshold[0],
                        imageData: pix,
                        width: canvasWidth,
                        height: canvasHeight,
                    }),
                );
            },
            complete: () => {
                this.lock = false;
            },
        });
    },
    closeProgress() {
        wx.showModal({
            title: '提示',
            content: '正在打印中，确认关闭打印进度条吗？',
            success: (res) => {
                if (res.confirm) {
                    this.setData({
                        printing: false,
                    });
                } else if (res.cancel) {
                }
            },
        });
    },
});
