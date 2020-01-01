// miniprogram/pages/pokemonCarProd/index.js
const app = getApp()

Page({
  
  /**
   * 页面的初始数据
   */
  data: {
    public:true,
    loading: false,
    carOpen:false,
    limit:2
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },
  bindCarNameInput(e){
    this.data.carName = e.detail.value
  },
  bindLimit(e){
    this.data.limit = parseInt(e.detail.value)
    if(isNaN(this.data.limit)){
      this.data.limit = 0
    }
  },
  onCreateClick(){
    if(!this.data.carName ||this.data.carName.length<=0){
      wx.showToast({
        icon: 'none',
        title: '给车取个名字吧'
      })
      return
    }
    if(this.data.limit <= 0){
      wx.showToast({
        icon: 'none',
        title: '请确定每人最大上车次数'
      })
      return
    }
    if (this.data.loading == false) {
      this.setData({ loading: true })
      const db = wx.cloud.database()
      //创建车数据
      this.createCar()
    }
  },
  createCar(){
    const db = wx.cloud.database()
    db.collection('car').doc(app.globalData.openid).set({
      data: {
        name: this.data.carName,
        nSW: app.globalData.nSW,
        nickName: app.globalData.nickName,
        limit: this.data.limit,
        lastUpdate: this.getLocalTime(),
        queue:0,
        leave:false,
        public:this.data.public
      },
      success: res => {
        this.data.carId = app.globalData.openid
        console.log('[车已创建],ID:',res._id)
        wx.redirectTo({ url: './running?carId=' + app.globalData.openid})
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '车位已满,发车失败'
        })
        console.error('[数据库] [新增记录] 失败：', err)
      }
    })
  },
  publicChange(){
    this.setData({
      public :!this.data.public
    })
  },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

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