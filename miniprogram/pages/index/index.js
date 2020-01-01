// miniprogram/pages/cusReg/index.js
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    nSW:"SW-",
    userInfo:{}
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
    wx.setKeepScreenOn({
      keepScreenOn: true
    })

    if (app.globalData.openid) {
      this.data.openid= app.globalData.openid
      this.showInfo();
    }else{
      // 在第一步，需检查是否有 openid，如无需获取
      wx.cloud.callFunction({
        name: 'login',
        data: {},
        success: res => {
          app.globalData.openid = res.result.openid
          this.data.openid= res.result.openid
          this.showInfo()          
        },
        fail: err => {
          wx.showToast({
            icon: 'none',
            title: '获取用户信息失败',
          })
          console.log('[云函数] [login] 获取 openid 失败，请检查是否有部署云函数，错误信息：', err)
        }
      })
    }
  },
  showInfo(){
    const db = wx.cloud.database()
    db.collection('user-info').where({
      _id: app.globalData.openid
    }).get({
      success: res => {
        if (res.data && res.data.length>0) {
          app.globalData.nSW = res.data[0].nSW
          app.globalData.nickName = res.data[0].nickName
          this.setData({ userInfo: res.data[0] })
        } else {
          this.setData({ userInfo: null })
        }
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '用户数据获取失败'
        })
        console.error('[数据库] [查询记录] 失败：', err)
      }
    })
  },
  onSwDeleteClick(){
    this.setData({nSW:"SW-"})
  },
  bindSWInput(e){
    if (e.detail.value.indexOf("SW-")!=0){
      return "SW-";
    }else{
      var value = e.detail.value
      if (value.length == 7 || value.length == 12){
        value = value + "-"
      }
      this.data.nSW = value
      return value
    }
  },
  bindPokemonNickNameInput(e){
    this.data.nickName = e.detail.value
  },
  onEditClick(){
    this.setData({edit:true})
  },
  onEditCancle(){
    this.setData({ edit: false })
  },
  bindSave(){
    if (!/^SW-\d{4}-\d{4}-\d{4}$/.test(this.data.nSW)){
      wx.showToast({
        icon: 'none',
        title: '请输入正确的SW号'
      })
      return;
    }
    var sw = this.data.nSW;
    const db = wx.cloud.database()
    db.collection('user-info').doc(app.globalData.openid).set({
      data:{
        nSW: sw,
        nickName: this.data.nickName
      }, 
      success: res => {
        app.globalData.nSW = sw
        app.globalData.nickName = this.data.nickName
        this.setData({
          userInfo: {
            nSW: sw,
            nickName: this.data.nickName
          },
          edit: false
        })
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '保存失败'
        })
        console.error('[数据库] [查询记录] 失败：', err)
      }
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

  }
})