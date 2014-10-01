/* Information
----------------------------------------------
File Name : followscrolling.js
URL : http://www.atokala.com/
Copyright : (C)atokala
Author : Masahiro Abe
--------------------------------------------*/
var ATFollowScrolling = function(vars) {
	var _self = this;

	//デフォルトオプション
	var options = {
		duration : 500,
		delay : 0,
		interval : 0,
		animation : 'quinticOut',
		offset : 0,
		long: true
	};

	//ブラウザチェック
	var browser = {
		ua : function() {
			return navigator.userAgent;
		},
		//IE
		ie : function() {
			return browser.ua.indexOf('MSIE') >= 0;
		},
		//IE6
		ie6 : function() {
			return browser.ua.indexOf('MSIE 6') >= 0;
		},
		//標準モード
		ieStandard : function() {
			return (document.compatMode && document.compatMode == 'CSS1Compat');
		}
	};

	//スクロール位置の取得
	var scroll = {
		top : function() {
			return (document.documentElement.scrollTop || document.body.scrollTop);
		},
		left : function() {
			return (document.documentElement.scrollLeft || document.body.scrollLeft);
		},
		width : function() {
			if (browser.ie && !browser.ieStandard) {
				return document.body.scrollWidth;
			}
			//モダンブラウザ
			else {
				return document.documentElement.scrollWidth;
			}
		},
		height : function() {
			if (browser.ie && !browser.ieStandard) {
				return document.body.scrollHeight;
			}
			//モダンブラウザ
			else {
				return document.documentElement.scrollHeight;
			}
		}
	};

	//ウインドウのサイズ取得
	var inner = {
		width : function() {
			//モダン
			if (window.innerWidth) {
				return window.innerWidth;
			}
			//IE
			else if (browser.ie) {
				//IE6 && 標準モード
				if (browser.ie6 && browser.ieStandard) {
					return document.documentElement.clientWidth;
				}
				//IE6互換モード && 他IE
				else {
					//IE6以下
					if (!document.documentElement.clientWidth) {
						return document.body.clientWidth;
					}
					//IE6以上
					else {
						return document.documentElement.clientWidth;
					}
				}
			}
		},
		height : function() {
			//モダン
			if (window.innerHeight) {
				return window.innerHeight;
			}
			//IE
			else if (browser.ie) {
				//IE6 && 標準モード
				if (browser.ie6 && browser.ieStandard) {
					return document.documentElement.clientHeight;
				}
				//IE6互換モード && 他IE
				else {
					//IE6以下
					if (!document.documentElement.clientHeight) {
						return document.body.clientHeight;
					}
					//IE6以上
					else {
						return document.documentElement.clientHeight;
					}
				}
			}
		}
	};

	var easing = {
		/*
		time = 現在秒 (現在
		begin = 最初の値
		change = 変動する値
		duration = 何秒かけて動くか
		*/
		liner : function(t, b, c, d) {
			return c * t / d + b;
		},
		quinticIn : function(t, b, c, d) {
			t /= d;
			return c * t * t * t * t * t + b;
		},
		quinticOut : function(t, b, c, d) {
			t /= d;
			t = t - 1;
			return -c * (t * t * t * t - 1) + b;
		}
	};

	//数字判別
	this.isNumber = function(num) {
		var num = parseInt(num);
		num = (!num)? 0 : num;

		return num;
	}

	//オプションの上書き設定
	this.config = function(property) {
		for (var i in property) {
			//設定されていない時は上書きしない
			if (!vars.hasOwnProperty(i)) {
				continue;
			}
			options[i] = property[i];
		}
	}

	//オブジェクト取得
	this.getElement = function(name) {
		if (name.indexOf('#') >= 0) {
			var id = name.replace('#', '');
			return document.getElementById(id);
		}
		else if (name.indexOf('.') >= 0) {
			var cl = name.replace('.', '');
			var tags = document.getElementsByTagName('*');
			var classes = this.getClass(cl, tags);
			return classes;
		}
	}

	//オブジェクト位置の取得
	this.getElementPosition = function(ele) {
		var obj = new Object();
		obj.x = 0;
		obj.y = 0;

		while(ele) {
			obj.x += ele.offsetLeft || 0;
			obj.y += ele.offsetTop || 0;
			ele = ele.offsetParent;
		}
		return obj;
	}

	//CSS取得
	this.getStyle = function(ele) {
		var style = ele.currentStyle || document.defaultView.getComputedStyle(ele, '');
		return style;
	}

	//Class取得
	this.getClass = function(name, tags) {
		var classes = new Array();

		for(var i = 0; i < tags.length; i++) {
			var names = tags[i].className.split(/\s+/);

			for(var j = 0; j < names.length; j++) {
				if (names[j] == name) {
					classes.push(tags[i]);
				}
			}
		}
		return classes;
	}

	//ID取得
	this.idSearch = function(name, tags) {
		for(var i = 0; i < tags.length; i++) {
			if (tags[i].id && tags[i].id.indexOf(name) >= 0) {
				return true;
			}
		}
		return false;
	}

	//親要素取得
	this.getParent = function(ele) {
		if (!options.parent) {
			return ele.parentNode;
		}
		else if (options.parent) {
			return document.getElementById(options.parent);
		}
	}

	//子要素取得
	this.getParents = function(ele) {
		var parent = ele.parentNode;
		var parents = new Array();

		while(parent) {
			parents.push(parent);
			parent = parent.parentNode;
		}

		return parents;
	}

	//高さ取得
	this.getHeight = function(ele) {
		var style = this.getStyle(ele);
		var border = this.isNumber(style.borderTopWidth) + this.isNumber(style.borderBottomWidth);
		var height = ele.offsetHeight + border;

		return height;
	}

	//飛び先取得
	this.getPostion = function(ele) {
		var parent = this.getParent(ele);
		var maxHeight = this.getHeight(parent);
		var style = this.getStyle(ele);
		var height = this.getHeight(ele);

		//ウインドウより高さが低い場合
		if (height + this.isNumber(style.marginTop) + this.isNumber(style.marginBottom) + options.offset < inner.height() || !options.long) {
			ele.toY = scroll.top() + options.offset - ele.y;
		}
		//ウインドウより高さが高い場合
		else {
			//上
			if (this.getElementPosition(ele).y - options.offset > scroll.top()) {
				ele.toY = scroll.top() + options.offset - ele.y;
			}
			//下
			else if (this.getElementPosition(ele).y + height + this.isNumber(style.marginTop) + this.isNumber(style.marginBottom) < scroll.top() + inner.height()) {
				ele.toY = scroll.top() + inner.height() - height - this.isNumber(style.marginTop) - this.isNumber(style.marginBottom) - ele.y;
			}
		}

		//リミット設定(親要素基準上)
		if (ele.toY < ele.top) {
			ele.toY = ele.top;
		}
		//リミット設定(親要素基準下)
		if (ele.toY > this.getElementPosition(parent).y + maxHeight - height - this.isNumber(style.marginTop) - this.isNumber(style.marginBottom) - ele.y) {
			ele.toY = this.getElementPosition(parent).y + maxHeight - height - this.isNumber(style.marginTop) - this.isNumber(style.marginBottom) - ele.y;
		}

		return ele.toY;
	}

	//オブジェクト取得
	this.setAnimation = function(ele) {
		if (!this.isHeight(ele)) return false;

		var now = new Date();
		var fromY = this.isNumber(ele.style.top);
		var run = function() {
			var toY = _self.getPostion(ele);
			ele.timer = setTimeout(function() {
				var time = new Date() - now;
				var next = easing[options.animation](time, fromY, toY - fromY, options.duration);
				if (time < options.duration) {
					ele.style.top = next + 'px';
					ele.timer = setTimeout(function(){run();}, options.interval);
				}
				else {
					ele.style.top = toY + 'px';
					clearTimeout(ele.timer);
				}
			}, options.interval);
		}
		ele.timer = setTimeout(function(){run();}, options.interval);
	}

	//オブジェクト取得
	this.setPosition = function(ele) {
		var toY = this.getPostion(ele);
		ele.style.top = toY + 'px';
	}

	//位置指定
	this.setValue = function(ele) {
		var isID = false;

		//親要素設定
		if (options.parent) {
			var parents = this.getParents(ele);
			isID = this.idSearch(options.parent, parents)
		}
		//親要素未設定
		else {
			isID = true;
		}

		var style = this.getStyle(ele);
		var parent = this.getParent(ele);
		var parentStyle = this.getStyle(parent);
		ele.toY = 0;

		if (style.position == 'static' || style.position == 'relative') {
			ele.style.position = 'relative';
			ele.y = this.getElementPosition(parent).y;
			ele.top = this.isNumber(style.top);
			ele.style.top = this.isNumber(style.top) + 'px';
		}
		else if (style.position == 'absolute') {
			ele.style.position = 'absolute';

			//親要素にエレメントがある場合
			if (isID) {
				ele.y = this.getElementPosition(parent).y;
				ele.top = this.isNumber(style.top);
				ele.style.top = this.isNumber(style.top) + 'px';
			}
			//親要素にエレメントがない場合
			else {
				ele.y = 0;
				ele.top = this.getElementPosition(parent).y + this.isNumber(style.top);
				ele.style.top = this.getElementPosition(parent).y + this.isNumber(style.top) + 'px';
			}
		}
	}

	//イベント設定
	this.setEvent = function(ele) {
		if (options.animation) {
			_self.setAnimation(ele);

			_self.addEvent(window, 'scroll', function() {
				clearTimeout(ele.timer);
				ele.timer = setTimeout(function(){
					clearTimeout(ele.timer);
					_self.setAnimation(ele);
				}, options.delay);
			});

			_self.addEvent(window, 'resize', function() {
				clearTimeout(ele.timer);
				ele.timer = setTimeout(function(){
					clearTimeout(ele.timer);
					_self.setAnimation(ele);
				}, options.delay);
			});
		}
		else {
			_self.setPosition(ele);

			_self.addEvent(window, 'scroll', function() {
				_self.setPosition(ele);
			});

			_self.addEvent(window, 'resize', function() {
				_self.setPosition(ele);
			});
		}
	}

	//イベント判別
	this.isHeight = function(ele) {
		var parent = _self.getParent(ele);
		var style = this.getStyle(parent);
		var maxHeight = _self.getHeight(parent) - _self.isNumber(style.paddingTop) - _self.isNumber(style.paddingBottom);
		var height = _self.getHeight(ele);

		//ウインドウよりオブジェクトが小さいと処理しない
		if (maxHeight < height) {
			return false;
		}

		return true;
	}

	//イベント追加
	this.addEvent = function(target, name, func) {
		// モダンブラウザ
		if(target.addEventListener) {
			target.addEventListener(name, func, false);
		}
		// IE
		else if(window.attachEvent) {
			target.attachEvent('on'+name, function(){func.apply(target);});
		}
	}

	this.load = function() {
		//コンストラクタ
		this.config(vars);

		this.addEvent(window, 'load', function() {
			var ele = _self.getElement(options.element);
			if (!ele) return;

			//Class
			if (ele.length > 0) {
				for (var i=0; i<ele.length; i++) {
					var tag = ele[i];
					_self.setValue(tag);
					_self.setEvent(tag);
				}
			}
			//ID
			else {
				_self.setValue(ele);
				_self.setEvent(ele);
			}
		});
	}
};
