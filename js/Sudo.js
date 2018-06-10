function nasReq(func, args, method, value) {
	window.postMessage({
		"target": "contentscript",
		"data": {
			"to": dappAddress,
			"value": value,
			"contract": {
				"function": func,
				"args": args
			}
		},
		"method": method
	}, "*");
}



function saveMap() {
	if (typeof (webExtensionWallet) == "undefined") {
		alert("需要先安装chrome钱包插件，才能继续操作");
		return;
	}
	var timestamp = new Date().getTime();
	var key = Math.floor(Math.random() * timestamp);

	var txHash = "";
	var func = "save"
	// var params = {};
	// params["gamedata"] = sudoku.resetData;
	// params["level"] = sudoku.level;
	// params["time"] = sudoku.usedTime;
	// var args = "[" + JSON.stringify(sudoku.resetData) + "," + sudoku.level +  "," + sudoku.usedTime + "]";
	var args = JSON.stringify([key.toString(), sudoku.resetData, sudoku.level, sudoku.usedTime]);
	// nasReq(func, args, "neb_sendTransaction", "0.0001");

	addQuestQueryId = setInterval(function () {
		addQuestQuery();
	}, 8000);

	// var callArgs = JSON.stringify([key.toString(), warrior]);
	serialNumber = nebPay.call(dappAddress, 0, func, args, {
		listener: function (res) {
			txHash = res.txhash;
			if (typeof res == "string") {
				clearInterval(addQuestQueryId);
			}
			else {
				$('#btn input[name="upload"]').val('正在处理，请稍等...');
			}
		}
	});

	//查询写入操作是否完成
	function addQuestQuery() {
		if (txHash.length != 0) {
			neb.api.getTransactionReceipt({ hash: txHash }).then(function (res) {

				if (res.status === 1) {
					clearInterval(addQuestQueryId);
					var url = getClearUrl() + "?id=" + key;
					var content = "<div class=\"col-xl-9 mx-auto\">" +
						"<p>上传成功，请将下方链接发送给好友，让他来挑战你的记录吧！</p>" +
						"<p>" + url+"</p></div>";
					$("#showmsg").show();
					$("#showmsg").html(content);
					$('#btn input[name="upload"]').hide();
					$('#btn input[name="upload"]').val('邀请好友来战');
					$('#btn input[name="start"]').show()

					if(sudoku.readdata)
					{
						$('#btn input[name="start"]').val('重新挑战');
						$('#btn input[name="startNew"]').show()
					}
					else
					{
						$('#btn input[name="start"]').val('重新开始');
						$('#btn input[name="startNew"]').hide()
					}
					sudoku.readdata = false;
				}
			}).catch(function (err) {
				console.log(err);
			});
		}
	}
}

function getClearUrl() {
	var url = "";
	if (location.href.indexOf("?") != -1) {
		url = location.href.substr(0, location.href.indexOf("?"));
	}
	else {
		url = location.href;
	}
	return url;
}

function getMap(index) {
	var func = "get"
	var args = "[" + index + "]";
	nasReq(func, args, "neb_call", "0");
}


//--------------------------所有的请求的回调都会在这里返回--------------------------
window.addEventListener('message', function (e) {
	console.log(e);
	if (!!e.data.data && !!e.data.data.neb_call) {
		var result = e.data.data.neb_call.result

		if (result === 'null') {
			console.log("get null")
		}
		else {
			try {
				result = JSON.parse(e.data.data.neb_call.result);
				if (result.level) {
					$('#btn input[name="start"]').show();
					sudoku.solving = result.gamedata;
					sudoku.level = result.level;
					sudoku.readtime = result.time;
					console.log("get success: mapData is:" + result.map);

					$("#friendtimer").show();
					$("#friendtime").text(sudoku.changeTimeToString(sudoku.readtime));
				}
				else {
					console.log("unknown data");
				}

			}
			catch (err) {
				console.log("unknown data");
			}
		}
	}
});


// 直接访问星云链的api
var nebulas = require("nebulas"),
	Account = nebulas.Account,
	neb = new nebulas.Neb();
// 设置使用的网络
neb.setRequest(new nebulas.HttpRequest("https://mainnet.nebulas.io"));
// neb.setRequest(new nebulas.HttpRequest("https://testnet.nebulas.io"));

// NebPay SDK 为不同平台的交易提供了统一的支付接口
// 开发者在Dapp页面中使用NebPay API可以通过浏览器插件钱包、手机app钱包等实现交易支付和合约调用。
var NebPay = require("nebpay");
var nebPay = new NebPay();
// ------------------钱包功能------------------------

// ------------------dapp合约地址---------------------------
var dappAddress = "n1r8y4ngg9TqaQQwyw2Kmu9JtYucbaYqtBV";
//f55b1a9621c7d17bbdb77c7dc831c1e0227e3843ed711ac96c8a519e737a03ee




Sudoku = function (size) {
	this.size = size || 9;
};

Sudoku.prototype = {
	usedTime: 0,		// 玩家所用的时间
	gameState: 'init',	// 游戏状态
	gameTimer: null,	// 计时器
	layout: [],		// 游戏局面
	answer: [],		// 答案
	answerPosition: [],// 答案的索引
	solving: [],		// 游戏时的待填局面
	resetData: [],	    // 记录初始局面重置局面用
	editIndex: '',		// 现在正在编辑id
	mask: null,		// 遮罩层
	level: 1,			// 难度
	readdata: false,   // 是否读取数据
	readtime: 0,		// 读取所用时间


	// 初始化
	init: function () {
		this.usedTime = 0;
		for (var i = 0; i < this.size; i++) {
			for (var j = 0; j < this.size; j++) {
				this.layout[i * this.size + j] = 0;
				this.solving[i * this.size + j] = 0;
				this.answerPosition[i * this.size + j] = 0;
				for (var h = 0; h < this.size; h++) {
					this.answer[i * this.size * this.size + j * this.size + h] = 0;
				}
			}
		}
	},
	// 取指定行列的答案
	getAnswer: function (row, col) {
		for (var i = 1; i <= this.size; i++) {
			this.answer[row * this.size * this.size + col * this.size + i - 1] = i;// 假定包含所有解
		}
		// 去除已经包含的
		for (var i = 0; i < this.size; i++) {
			if (this.layout[i * this.size + col] != 0) {
				this.answer[row * this.size * this.size + col * this.size
					+ this.layout[i * this.size + col] - 1] = 0;// 去除列中包含的元素
			}
			if (this.layout[row * this.size + i] != 0) {
				this.answer[row * this.size * this.size + col * this.size
					+ this.layout[row * this.size + i] - 1] = 0;// 去除行中包含的元素
			}
		}
		var subnum = Math.floor(Math.sqrt(this.size));
		var x = Math.floor(row / subnum);
		var y = Math.floor(col / subnum);
		for (var i = x * subnum; i < subnum + x * subnum; i++) {
			for (var j = y * subnum; j < subnum + y * subnum; j++) {
				if (this.layout[i * this.size + j] != 0)
					this.answer[row * this.size * this.size + col * this.size
						+ this.layout[i * this.size + j] - 1] = 0;// 去小方格中包含的元素
			}
		}
		this.randomAnswer(row, col);
	},
	// 对指定行列的答案随机排序
	randomAnswer: function (row, col) {
		// 随机调整一下顺序
		var list = [];
		for (var i = 0; i < this.size; i++)
			list.push(this.answer[row * this.size * this.size + col * this.size
				+ i]);
		var rdm = 0, idx = 0;
		while (list.length != 0) {
			rdm = Math.floor(Math.random() * list.length);
			this.answer[row * this.size * this.size + col * this.size + idx] = list[rdm];
			list.splice(rdm, 1);
			idx++;
		}
	},
	// 计算指定行列可用解的数量
	getAnswerCount: function (row, col) {
		var count = 0;
		for (var i = 0; i < this.size; i++)
			if (this.answer[row * this.size * this.size + col * this.size + i] != 0)
				count++;
		return count;
	},
	// 返回指定行列在指定位置的解
	getAnswerNum: function (row, col, ansPos) {
		// 返回指定布局方格中指定位置的解
		var cnt = 0;
		for (var i = 0; i < this.size; i++) {
			// 找到指定位置的解，返回
			if (cnt == ansPos
				&& this.answer[row * this.size * this.size + col
				* this.size + i] != 0)
				return this.answer[row * this.size * this.size + col
					* this.size + i];
			if (this.answer[row * this.size * this.size + col * this.size + i] != 0)
				cnt++;// 是解，调整计数器
		}
		return 0;// 没有找到，逻辑没有问题的话，应该不会出现这个情况
	},
	// 生成游戏局面
	generate: function () {
		this.init();
		var curRow = 0, curCol = 0;
		while (curRow != this.size) {
			if (this.answerPosition[curRow * this.size + curCol] == 0)
				this.getAnswer(curRow, curCol);// 如果这个位置没有被回溯过，就不用重新计算解空间
			var ansCount = this.getAnswerCount(curRow, curCol);
			if (ansCount == this.answerPosition[curRow * this.size + curCol]
				&& curRow == 0 && curCol == 0)
				break;// 全部回溯完毕
			if (ansCount == 0) {
				this.answerPosition[curRow * this.size + curCol] = 0;// 无可用解，应该就是0
				// alert("无可用解，回溯！");
				if (curCol > 0) {
					curCol--;
				} else if (curCol == 0) {
					curCol = 8;
					curRow--;
				}
				this.layout[curRow * this.size + curCol] = 0;
				continue;
			}
			// 可用解用完
			else if (this.answerPosition[curRow * this.size + curCol] == ansCount) {
				// alert("可用解用完，回溯！");
				this.answerPosition[curRow * this.size + curCol] = 0;
				if (curCol > 0) {
					curCol--;
				} else if (curCol == 0) {
					curCol = 8;
					curRow--;
				}
				this.layout[curRow * this.size + curCol] = 0;
				continue;
			} else {
				// 返回指定格中，第几个解
				this.layout[curRow * this.size + curCol] = this.getAnswerNum(
					curRow, curCol, this.answerPosition[curRow * this.size
					+ curCol]);
				// alert("位置：(" + curRow + ", " + curCol + ")="
				// + layout[curRow][curCol]);
				this.answerPosition[curRow * this.size + curCol]++;
				if (curCol == 8) {
					curCol = 0;
					curRow++;
				} else if (curCol < 8) {
					curCol++;
				}
			}
		}
	},
	//绑定事件
	gameEvent: function () {
		var self = this;
		//按钮点击事件
		$("#btn input:button").click(function (eventObject) {
			switch (eventObject.currentTarget.name) {
				case "start":
					$('#btnStartNew').hide();
					self.initLayout();
					break;
				case "upload":
					saveMap();
					break;
				case "startNew":
					location.href = getClearUrl();
				break;
				// case "showAnswer":
				// 	self.showAnswer();
				// 	break;
				// case "reset":
				// 	self.reset();
				// 	break;
			}
		});
		//单击可编辑事件
		$("#gameBoard").click(function (eventObj) {
			// if(this.gameState != 'start') return;
			var $target = $(eventObj.target);
			var posi = $target.position();
			var gameBoardPos = $(this).position();
			var selectBoardPos = { top: gameBoardPos.top + posi.top, left: gameBoardPos.left + posi.left };
			var $selectBoard = $("#selectBoard");
			if ($target.hasClass('editable')) {
				if (posi.top + $selectBoard.height() > $(this).height()) {
					selectBoardPos.top = selectBoardPos.top - $selectBoard.height() + $target.height();
				}
				if (posi.left + $selectBoard.width() > $(this).width()) {
					selectBoardPos.left = selectBoardPos.left - $selectBoard.width() + $target.width();
				}
				$selectBoard.css({ 'top': selectBoardPos.top, 'left': selectBoardPos.left, 'display': 'block' });
				self.editIndex = eventObj.target.id;
			}
		});
		//数字面板点击事件
		$('#selectBoard').click(function (eventObj) {
			var $target = $(eventObj.target);
			var userNum = parseInt($target.text());
			self.tmpnum = parseInt($("#" + self.editIndex).text());
			$("#" + self.editIndex).text(userNum);
			self.solving[self.editIndex] = userNum;
			for (var i = 0; i < self.size * self.size; i++)$("#" + i).removeClass('background0');
			self.check();
			$('#selectBoard').css({ 'display': 'none' });
			var solveStr = self.solving.join();
			if (solveStr.indexOf('0') < 0) { self.checkAllAnswer(); }//最后一个检查是否完成游戏			
		}).mouseleave(function () {
			$(this).css({ 'display': 'none' });
		});;

	},
	// 初始化游戏局面
	initLayout: function () {
		
		$("#showmsg").hide();
		$("#timer").show();

		var layoutStr = "";//游戏局面html
		var selectTable = "";//数字选择框
		this.gameState = "start";
		// $('#btn input[name="pause"]').val('暂停游戏');
		$("#gameBoard").html("");
		$('#selectBoard').html("");
		if (this.readdata) {
			this.usedTime = 0;
			// this.level = 2;
			// this.solving = [6, 8, 0, 7, 9, 5, 0, 4, 2, 4, 5, 0, 1, 0, 3, 9, 7, 6, 0, 7, 9, 2, 6, 4, 8, 5, 3, 2, 0, 7, 5, 0, 9, 6, 8, 4, 0, 1, 4, 6, 0, 8, 0, 2, 7, 8, 0, 5, 4, 7, 2, 0, 9, 1, 7, 0, 6, 9, 5, 1, 4, 3, 8, 3, 9, 1, 0, 0, 7, 2, 6, 0, 5, 4, 8, 0, 2, 6, 0, 0, 9];
			for (var i = 0; i < this.size; i++) {
				for (var j = 0; j < this.size; j++) {
					if (((i < 3 || i > 5) && (j < 3 || j > 5)) || ((i >= 3 && i <= 5) && (j >= 3 && j <= 5))) {
						background = "background1";
					} else {
						background = "background2";
					}
					if (this.solving[i * this.size + j] != 0) {
						layoutStr += '<div class="block radius ' + background + '" id="' + (i * this.size + j) + '" name="blank">' + this.solving[i * this.size + j] + '</div>'
					} else {
						console.log("==");
						layoutStr += '<div class="block radius editable ' + background + '" id="' + (i * this.size + j) + '" name="blank">' + "" + '</div>'
					}
				}
			}
		}
		else {
			this.level = this.getLevel() || 1;	// 游戏难度级别
			this.generate(this.size);
			for (var i = 0; i < this.size; i++) {
				for (var j = 0; j < this.size; j++) {
					var rdm;
					if (this.level < 4) {
						rdm = Math.floor(Math.random() * 4 + 1);//12345  1/5 2/5 3/5 3/4
					} else {
						rdm = Math.floor(Math.random() * 4 + 2);
					}
					if (((i < 3 || i > 5) && (j < 3 || j > 5)) || ((i >= 3 && i <= 5) && (j >= 3 && j <= 5))) {
						background = "background1";
					} else {
						background = "background2";
					}
					if (this.level < rdm) {
						layoutStr += '<div class="block radius ' + background + '" id="' + (i * this.size + j) + '" name="blank">' + this.layout[i * this.size + j] + '</div>'
						this.solving[i * this.size + j] = this.layout[i * this.size + j];
						this.layout[i * this.size + j] = 0;
					} else {
						console.log("==");
						layoutStr += '<div class="block radius editable ' + background + '" id="' + (i * this.size + j) + '" name="blank">' + "" + '</div>'
					}
				}
			}
		}
		this.resetData = this.solving.concat();


		$("#gameBoard").html(layoutStr);

		//数字选择表初始化
		for (var i = 1; i < 10; i++) {
			selectTable += '<div name="selectDiv" class="selectDiv font block color radius">' + i + '</div>';
		}
		$('#selectBoard').html(selectTable);
		//生成成功计时开始
		var self = this;
		clearInterval(this.gameTimer);
		this.gameTimer = null;
		this.gameTimer = setInterval(function () {
			self.showTime()
		}, 1000);
		this.showLevelTips(this.level);
		$('#btn input[name="start"]').hide();
	},
	// 检查玩家的答案是否正确
	checkAllAnswer: function () {
		var flag = 0;
		for (var i = 0; i < 9; i++) {
			for (var j = 0; j < 9; j++) {
				if ($("#" + (i * 9 + j)).hasClass("background0")) flag++;
			}
		}
		if (flag == 0 && this.gameState != 'init') {
			clearInterval(this.gameTimer);
			//console.log("完全正确！");
			// this.showTips("你太棒了");
			
			$("#btnUpload").show();
		}
	},

	// 当输入答案时，检查是否有冲突
	check: function () {
		for (var _index = 0; _index < this.size * this.size; _index++) {
			if ($("#" + _index).hasClass('editable') && this.solving[_index]) {
				var row = parseInt(parseInt(_index) / 9);
				var col = parseInt(parseInt(_index) % 9);
				var tabX = parseInt(row / 3);
				var tabY = parseInt(col / 3);
				for (var i = 0; i < 9; i++) {
					for (var j = 0; j < 9; j++) {
						if (i == row || j == col || (parseInt(i / 3) == tabX && parseInt(j / 3) == tabY)) {//与被检查元素相关
							if (this.solving[i * 9 + j] == this.solving[parseInt(_index)] && parseInt(_index) != i * 9 + j) {
								$("#" + (i * 9 + j)).addClass('background0');
								$("#" + parseInt(_index)).addClass('background0');
							}
						}
					}
				}
			}
		}
	},

	// 取得游戏难度等级
	getLevel: function () {
		var level = $("input[name='cd-dropdown']").val();
		return level < 0 ? 1 : level;
	},

	// 将时间间隔转换为时间字符串，如90秒转化为：00:01:30
	changeTimeToString: function (time) {
		var res = '';
		var h = Math.floor(time / 3600);
		if (h < 10) {
			h = '0' + h;
		}
		var m = time % 3600;
		m = Math.floor(m / 60);
		if (m < 10) {
			m = '0' + m;
		}
		var s = time % 60;
		if (s < 10) {
			s = '0' + s;
		}
		res = h + ':' + m + ':' + s;
		return res;
	},

	//显示时间
	showTime: function () {
		this.usedTime++;
		$("#time").text(this.changeTimeToString(this.usedTime));
	},

	levelTips: ["", "初级", "中级", "高级", "骨灰级"],
	showLevelTips: function (level) {
		$("#levelSelect").hide();
		$("#levelTips").show();
		$("#level").text(this.levelTips[level]);
	}
};

var sudoku = new Sudoku(9);
jQuery(function ($) {
	//难度选择下拉列表创建
	$('#cd-dropdown').dropdown();

	$("#timer").hide();
	$("#showmsg").hide();
	$("#btnUpload").hide();
	$("#levelTips").hide();
	$('#btnStartNew').hide();

	var url = location.search; //获取url中"?"符后的字串

	if (typeof (webExtensionWallet) == "undefined") {
		alert("检测到未安装chrome钱包插件，无法用读取分享内容");
		url = "";
	}

	if (url.indexOf("?id=") != -1) {
		var str = url.substr(4);
		alert(str);
		getMap(parseInt(str));
		sudoku.readdata = true;
	}

	if (sudoku.readdata) {
		
		$("#levelSelect").hide();
		$('#btn input[name="start"]').val('开始挑战');
		$('#btn input[name="start"]').hide();
	}
	else {
		$("#friendtimer").hide();
		$("#levelSelect").show();
		$('#btn input[name="start"]').val('开始游戏');
	}
	// sudoku.initLayout();
	sudoku.gameEvent()//绑定游戏面板事件
});
