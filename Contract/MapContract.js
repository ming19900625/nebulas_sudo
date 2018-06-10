'use strict';

// 定义信息类
var Info = function (text) {
    if (text) 
    {
        var obj = JSON.parse(text);   // 如果传入的内容不为空将字符串解析成json对象
        this.gamedata = obj.gamedata; // 初始显示
        this.level = obj.level;       // 难度
        this.time = obj.time;         // 所花费时间
        this.author = obj.author;     // 上传者
    } 
    else 
    {
        this.gamedata = [6, 8, 0, 7, 9, 5, 0, 4, 2, 4, 5, 0, 1, 0, 3, 9, 7, 6, 0, 7, 9, 2, 6, 4, 8, 5, 3, 2, 0, 7, 5, 0, 9, 6, 8, 4, 0, 1, 4, 6, 0, 8, 0, 2, 7, 8, 0, 5, 4, 7, 2, 0, 9, 1, 7, 0, 6, 9, 5, 1, 4, 3, 8, 3, 9, 1, 0, 0, 7, 2, 6, 0, 5, 4, 8, 0, 2, 6, 0, 0, 9];
        this.level = 1;
        this.time = 1;
        this.author = "";
    }
};

// 将信息类对象转成字符串
Info.prototype.toString = function () {
    return JSON.stringify(this)
};

// 定义智能合约
var InfoContract = function () {
    // 使用内置的LocalContractStorage绑定一个map，名称为infoMap
    // 这里不使用prototype是保证每布署一次该合约此处的infoMap都是独立的
    // LocalContractStorage.defineProperty(this, "size", null);
    LocalContractStorage.defineMapProperty(this, "infoMap", {
        // 从infoMap中读取，反序列化
        parse: function (text) {
            return new Info(text);
        },
        // 存入infoMap，序列化
        stringify: function (o) {
            return o.toString();
        }
    });
};

// 定义合约的原型对象
InfoContract.prototype = {
    // init是星云链智能合约中必须定义的方法，只在布署时执行一次
    init: function () {
        // this.size = 0;
    },
    // 提交信息到星云链保存，传入分数
    save: function (key,data,level,time) {
        // this.size += 1;

        // 此处调用前面定义的序列化方法stringify，将Info对象存储到存储区
        var _info = new Info();
        _info.gamedata = data;
        _info.level = level;
        _info.time = time;
        _info.author = Blockchain.transaction.from;
        this.infoMap.put(key, _info);
    },

    get: function (key) {
        // if (index > this.size || index <= 0) {
        //     throw new Error("index is not valid");
        // }
        var info = this.infoMap.get(key);
        return info;
    }
};
// 导出代码，标示智能合约入口
module.exports = InfoContract;