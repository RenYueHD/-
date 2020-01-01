// miniprogram/pages/pokemonCarProd/running.js
Page({
  nextLoading:false,
  addLoading:false,
  waitting:true,
  allSubs:[],
  history:[],
  newStep:true, //当前是否新的一车
  special:0,  //额外加人标记
  data: {
    keyDefault:3,
    setter:3,
    limit:2,
    interval:4000,
    init:false,
    failCount:0,
    key:"生成中...",
    subKeys:[],
    subCount:0,
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.carId = options.carId;
    const db = wx.cloud.database()
    db.collection('car').doc(options.carId).get({
      success: res => {
        this.setData({car:res.data,limit:res.data.limit})
        this.data.init = true;
        this.startCar()
        this.nextCar()
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '你的车炸了,再发一次吧'
        })
        console.log("读取车辆信息失败",err)
      }
    })
    
  },
  pubKeys(){
    var currentLimit = this.special + this.data.keyDefault - this.data.subKeys.length;
    console.log('本轮可上车人数',currentLimit)
    var result = null;
    //若是新的一步,则直接重选
    if(this.newStep){
      this.special = 0;
      this.newStep = false;
      result = this.choose(this.allSubs, currentLimit);
      console.log('新的一轮,选出 ',result)
    }else{
      //剔除已选
      if (currentLimit - this.data.subKeys.length >0){
        var useful = this.allSubs.filter(p => this.data.subKeys.filter(q => q.subId == p._id).length<=0)
        result = this.choose(useful, currentLimit - this.data.subKeys.length);
        console.log('旧轮次,选出剩余人次',result)
        if(result.length>0){
          this.data.subKeys.forEach(p=>{
            result.push(p);
          })
        }else{
          // result = this.data.subKeys;
          console.log('没有人了')
          return;
        }
      }else{
        console.log('旧轮次,已满人,不再更新')
        return
      }
    }

    const db = wx.cloud.database()
    db.collection('car').doc(this.data.car._id).update({
      data: {
        keys: result,
        lastUpdate: this.getLocalTime(),
        queue: this.allSubs.length,
        out: this.allSubs.filter(p => this.history.filter(q => q == p._id).length >= this.data.limit).map(p => p._id)
      },
      success: res => {
        this.setData({ subKeys: result })
      }
    })
  },
  onAddClick(){
    var that = this
    this.special++;
    this.setData({ addLoading: true, setter: this.special + this.data.keyDefault })
    //this.pubKeys();
    setTimeout(function () {
      that.setData({ addLoading: false })
    }, 1000)
  },
  startCar(){
    this.setData({waitting:true})
    this.interval = setInterval(this.pubKeys, this.data.interval)
    console.warn(`开始监听乘客`)
    const db = wx.cloud.database()
    this.messageListener = db.collection('car-sub').where({
      carId:this.data.car._id
    }).watch({
      onChange: res=>{
        this.allSubs = res.docs
        this.setData({ subCount:res.docs.length})
      },
      onError: e => {
        this.data.failCount ++;
        if (this.data.failCount >= 10) {
          this.setData({ waitting: false })
          console.log('监听乘客失败,超过最大次数,',e)
        } else {
          console.log('监听乘客失败,重试,', e)
          this.startCar()
        }
      },
    })
    
  },
  generateKey(length) {
    var key = "";
    for (var i = 0; i < length; i++) {
      key += parseInt(Math.random() * 10000000) % 10
    }
    return key;
  },
  nextCar(){
    this.setData({ nextLoading:true, key: this.generateKey(4),subKeys:[] ,setter:this.data.keyDefault })
    this.newStep = true
    this.special = 0;
    var that = this
    // this.pubKeys();
    setTimeout(function(){
      that.setData({nextLoading:false})
    },3000)
  },
  stopCar(){
    wx.navigateBack()
  },
  //从某集合中选出可用的N个人,并计入历史
  choose(arr,count){
    var key = this.data.key;
    var that = this
    //筛选出不超过限制次数的人数
    var subs = arr.filter(p => that.history.filter(q => q == p._id).length < that.data.limit);
    // console.log("发钥匙,排队总人数:" + this.allSubs.length + ",可上车人数:" + subs.length)
    var thisHas = []
    if (subs.length > 0) {
      //若可用人数<=需要的人数,则全部上
      if (subs.length <= count) {
        for (var i = 0; i < subs.length; i++) {
          that.history.push(subs[i]._id);
          thisHas.push({ key: key, subId: subs[i]._id, count: that.history.filter(p => p == subs[i]._id).length })
        }
      } else {
        //否则,随机选取
        for (var i = 0; i < count; i++) {
          var idx = Math.floor(Math.random() * (subs.length))
          var choose = subs.splice(idx, 1)
          if(choose.length>0){
            that.history.push(choose[0]._id);
            thisHas.push({ key: key, subId: choose[0]._id, count: that.history.filter(p => p == choose[0]._id).length })
          }
        }
      }
    }
    return thisHas;
  },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },
  heartbeat() {
    const db = wx.cloud.database()
    db.collection('car').doc(this.carId).update({
      data:{
        lastUpdate: this.getLocalTime()
      },success:res=>{
        console.log("心跳成功")
      }
    })
  },
  pause(){
    const db = wx.cloud.database()
    db.collection('car').doc(this.carId).update({
      data: {
        lastUpdate: this.getLocalTime(),
        leave:true
      }, success: res => {

      }
    })
  },
  goon(){
    const db = wx.cloud.database()
    db.collection('car').doc(this.carId).update({
      data: {
        lastUpdate: this.getLocalTime(),
        leave: false
      }, success: res => {

      }
    })
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.allSubs = []
    this.setData({subCount:0})

    if(this.data.init){
      this.goon()
      this.startCar()
    }

    this.beat = setInterval(this.heartbeat, 60 * 1000)
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    clearInterval(this.beat)
    this.pause();
    if (this.messageListener) {
      this.messageListener.close()
      this.messageListener = null;
    }
    if(this.interval){
      clearInterval(this.interval);
    }
    
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    if (this.messageListener){
      this.messageListener.close()
    }
    if (this.interval) {
      clearInterval(this.interval);
    }
    if(this.data.car){
      const db = wx.cloud.database()
      db.collection('car').doc(this.data.car._id).remove()
    }
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