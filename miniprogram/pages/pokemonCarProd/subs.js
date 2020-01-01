// miniprogram/pages/pokemonCarProd/subs.js
const app = getApp()

Page({
  timeout:20,
  /**
   * 页面的初始数据
   */
  data: {
    list:[],
    shown:false,
    key:'等车中',
    over:false,
    nSW:"SW-",
    loading:false,
    failCount: 0,
    init: false,
    car:null,
    count:0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if(options.nSW){
      this.setData({
        nSW:options.nSW
      })
    }
    
    //加载所有车
    const db = wx.cloud.database()
    db.collection("car").orderBy("lastUpdate","desc").where({
      lastUpdate: db.command.gt(this.getLocalTime() - this.timeout * 60 * 1000),
      public:true
    }).get({
      success: res => {
        console.log('共有数据',res.data)
        res.data.forEach(item=>{
          item.span = parseInt((this.getLocalTime()-item.lastUpdate)/1000/60)
        })
        this.setData({
          list:res.data
        })
      }
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },
  onSwDeleteClick() {
    this.setData({ nSW: "SW-" })
  },
  bindSWInput(e) {
    console.log(e.detail.value)
    if (e.detail.value.indexOf("SW-") != 0) {
      return "SW-";
    } else {
      var value = e.detail.value
      if (value.length == 7 || value.length == 12) {
        value = value + "-"
      }
      this.setData({
        nSW:value
      })
      return value
    }
  },
  showCar(){
    if (this.data.loading == false) {
      if (!/^SW-\d{4}-\d{4}-\d{4}$/.test(this.data.nSW)) {
        console.log(this.data.nSW)
        wx.showToast({
          icon: 'none',
          title: '请输入正确的SW号'
        })
        return;
      }

      var sw = this.data.nSW;
      this.setData({ loading: true })

      const db = wx.cloud.database()
      db.collection("car").where({ nSW: sw }).get({
        success: res => {
          if (res.data && res.data.length > 0 && (this.getLocalTime() - res.data[0].lastUpdate) / 1000 / 60 < this.timeout) {
            this.setData({
              loading:false,
              car: res.data[0],
              shown:true
            })

          } else {
            this.setData({ loading: false })
            wx.showToast({
              icon: 'none',
              title: '车早没了,下次早点哦'
            })
          }
        }, fail: res => {
          wx.showToast({
            icon: 'none',
            title: '上车失败'
          })
          console.error('[数据库] [查询记录] 失败：', err)
        }
      })
    }
  },
  onGoClick(){
    if(this.data.shown && this.data.loading==false && this.data.car){
      this.setData({ init: true})
      //创建监听数据
      this.createSubData();
      //创建等车监听器            
      this.waittingCar()
    }
  },
  onBackClick(){
    this.setData({
      shown:false
    })
  },
  createSubData(){
    const db = wx.cloud.database()
    db.collection('car-sub').doc(app.globalData.openid).set({
      data:{
        carId: this.data.car._id,
        nSW: app.globalData.nSW,
        nickName: app.globalData.nickName
      },
      success: res => {
        this.data.subId = app.globalData.openid
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '座位已满,上车失败'
        })
      }
    })
  },
  waittingCar(){
    console.warn(`开始监听车况`)
    
    const db = wx.cloud.database()
    this.messageListener = db.collection('car').where({
      _id: this.data.car._id
    }).watch({
      onChange: res => {
        console.log('车况改变',res.docs)
        if (res.docs.length > 0 && (this.getLocalTime() - res.docs[0].lastUpdate) / 1000 / 60 < this.timeout){
          this.setData({ car:res.docs[0],queue: res.docs[0].queue})
          if (this.data.over == false) {
            if(res.docs[0].name != this.data.car.name){
              this.stopSub()
              this.deleteSub()
              this.setData({ loading: false })
              wx.showModal({
                title: '提示',
                content: '车况改变了,重新上车吧',
                showCancel: false,
                success: res => {
                  wx.navigateBack({})
                }
              })
              return
            }
            var car = res.docs[0]
  
            //查看密钥
            if(car.keys && car.keys.length>0){
              var found = false
              car.keys.forEach(k=>{
                if(k.subId == app.globalData.openid){
                  this.setData({key:k.key,count:k.count})
                  found = true
                }
              })
              if(!found){
                if (car.limit <= this.data.count || car.out && car.out.filter(p => p == app.globalData.openid).length>0){
                  this.stopSub()
                  this.deleteSub()
                  this.setData({ loading: false })
                  wx.showModal({
                    title: '提示',
                    content: '已达到最大上车次数',
                    showCancel: false,
                    success: res => {
                      wx.navigateBack({})
                    }
                  })
                }else{
                  this.setData({key:'等车中'})
                }
              }else{
                if (car.limit <= this.data.count || car.out && car.out.filter(p => p == app.globalData.openid).length > 0) {
                  this.setData({ over: true })
                  this.deleteSub()
                  // this.stopSub()
                }
              }
            }else{
              if (car.limit <= this.data.count || car.out && car.out.filter(p => p == app.globalData.openid).length > 0) {
                this.stopSub()
                this.deleteSub()
                this.setData({ loading: false })
                wx.showModal({
                  title: '提示',
                  content: '已达到最大上车次数',
                  showCancel: false,
                  success: res => {
                    wx.navigateBack({})
                  }
                })
              }
            }
          }else{
            this.stopSub()
            this.deleteSub()
            this.setData({ loading: false })
            wx.showModal({
              title: '提示',
              content: '已达到最大上车次数',
              showCancel: false,
              success: res => {
                wx.navigateBack({})
              }
            })
          }
        }else{
          this.stopSub()
          this.deleteSub()
          this.setData({loading:false})
          wx.showModal({
            title: '提示',
            content: '车已经停了',
            showCancel:false,
            success:res=> {
              wx.navigateBack({})
            }
          })
        }
      },
      onError: e => {
        console.log('监听车主失败', e)
      },
    })
    this.setData({ listenninig: true })
  },
  
  stopSub(){
    if (this.messageListener) {
      this.messageListener.close()
      this.messageListener = null;
      this.setData({ listenninig: false ,loading:false})
    }
  },
  deleteSub(){
    if (this.data.subId) {
      const db = wx.cloud.database()
      db.collection('car-sub').doc(this.data.subId).remove()
    }
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    if(this.data.init && this.data.car && this.data.over==false){
      this.waittingCar()
    }
  },
  goAway(){
    wx.navigateBack()
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    this.stopSub()
    console.log("停止监控")
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    if (this.messageListener) {
      this.messageListener.close()
    }
    this.deleteSub()
  },
  carClick(e){
    this.setData({
      nSW:e.currentTarget.id
    })
  },
  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },
  getLocalTime() {
    var i = 8
    //参数i为时区值数字，比如北京为东八区则输进8,纽约为西5区输入-5
    if (typeof i !== 'number') return;
    var d = new Date();
    //得到1970年一月一日到现在的秒数
    var len = d.getTime();
    //本地时间与GMT时间的时间偏移差
    var offset = d.getTimezoneOffset() * 60000;
    //得到现在的格林尼治时间
    var utcTime = len + offset;
    return new Date(utcTime + 3600000 * i).getTime();
  }
})