(function () {
    'use strict';

    $(document).ready(function () {
        'use strict';

        //------------------------------
        // 定数
        //------------------------------

        var RESULT_OK        = 'ok';
        var RESULT_BAD_PARAM = 'bad param';

        var NAME_LENGTH_LIMIT = 30;

        // サムネイルのサイズ
        var thumbnailWidth        = 250;
        var thumbnailHeight       = 175;
        var thumbnailSourceWidth  = 500;
        var thumbnailSourceHeight = 350;

        // スタンプの元の画像のサイズ(正方形を想定)
        var stampSize = 250;

        // tweetボタン関連
        var twitterHashtag = '#すた4コマ';
        var twitterTextBeforePost = 'すたちゅーさんの4コマまんがを描こう！';
        var twitterTextAfterPost  = 'すたちゅーさんの4コマまんがを描いたよ！';
        var htmlbase = '<a href="https://twitter.com/intent/tweet?button_hashtag={hashtag}&text={text}" '
                     + 'class="twitter-hashtag-button" data-lang="ja" data-size="large" '
                     + 'data-related="rgx_6" data-url="{data-url}">Tweet #{hashtag}</a>';

        //------------------------------
        // 変数
        //------------------------------

        var socket;

        // お絵かきの変数
        // 描画する始点のX座標
        var startX;
        // 描画する始点のY座標
        var startY;
        // 描画する色
        var color = 'rgba(0, 0, 0, 1)';
        var eraseColor = 'rgba(0, 0, 0, 1)';
        // 描画する線の太さ
        var drawWidth = 3;
        // スタンプ描画倍率
        var drawScale = 0.5;
        // スタンプ回転
        var drawAngle = 0;
        // 反転
        var vInversionFactor = 1;
        var hInversionFactor = 1;
        // 描画中フラグ
        var drawFlag = false;
        // canvasオブジェクト
        var combinationCanvas = $('#combinationCanvas').get(0);
        var frameCanvas       = $('#frameCanvas').get(0);
        var canvas            = $('#mainCanvas').get(0);
        var cursorCanvas      = $('#cursorCanvas').get(0);
        var previewCanvas     = $('#previewCanvas').get(0);
        // contextオブジェクト
        var combinationContext;
        var frameContext;
        var context;
        var cursorContext;
        var previewContext;

        // 操作可否フラグ
        var isDisabled = true;

        // 描いた人の名前
        var author = '名無しさん';

        //------------------------------
        // 準備
        //------------------------------

        if (!canvas.getContext) {
            alert('ブラウザがCanvasに対応してないよ(´・ω・｀)');
            return;
        }

        combinationContext = combinationCanvas.getContext('2d');

        frameContext = frameCanvas.getContext('2d');

        context = canvas.getContext('2d');
        context.lineCap = 'round';
        context.lineJoin = 'round';

        cursorContext = cursorCanvas.getContext('2d');

        previewContext = previewCanvas.getContext('2d');
        previewContext.lineCap = 'round';
        previewContext.lineJoin = 'round';

        // slider初期化
        $('#brushSize').slider({
            min: 1,
            max: 20,
            value: drawWidth,
            tooltip: 'hide',
        });
        $('#stampSize').slider({
            // min: 0 だとubuntuのfxで0にした後の挙動がおかしかったので0.01に設定
            min: 0.01,
            max: 2,
            step: 0.01,
            value: drawScale,
            tooltip: 'hide',
        });
        $('#stampAngle').slider({
            min: -1,
            max: 1,
            step: 0.01,
            value: drawAngle,
            tooltip: 'hide',
        });
        changeStampMode();

        var image = new Image();
        image.src = '/images/frame.png';
        image.onload = function () {
            frameContext.drawImage(image, 0, 0);
        };

        // serverに接続
        // hack : 必要になってから接続すればいいか？
        socket = io.connect();

        //------------------------------
        // メッセージハンドラ定義
        //------------------------------

        /**
         * 接続成功
         */
        socket.on('connected', function () {
            'use strict';
            console.log('connected');

            isDisabled = false;
        });

        //------------------------------
        // Canvas イベントハンドラ
        //------------------------------

        /**
         * Canvas MouseDown イベント
         */
        $('#cursorCanvas').mousedown(function (e) {
            'use strict';
            // console.log('mouse down');
            e.stopPropagation();
            if (isDisabled) return;

            startX = Math.round(e.pageX) - $('#mainCanvas').offset().left;
            startY = Math.round(e.pageY) - $('#mainCanvas').offset().top;

            var mode = getDrawMode();
            if (mode === 'brush' || mode === 'eraser'){
                drawFlag = true;
                var c = mode === 'brush' ? color : eraseColor;
                drawPoint(startX, startY, drawWidth, c);
            } else if (mode === 'stamp') {
                drawStamp(startX, startY);
            } else {

            }
        });

        /**
         * Canvas MouseMove イベント
         */
        $('#cursorCanvas').mousemove(function (e) {
            'use strict';
            // console.log('mouse move');
            e.stopPropagation();
            if (isDisabled) return false;

            if (drawFlag) {
                var endX = Math.round(e.pageX) - $('#mainCanvas').offset().left;
                var endY = Math.round(e.pageY) - $('#mainCanvas').offset().top;
                var c = getDrawMode() === 'brush' ? color : eraseColor;
                drawLine([startX, endX], [startY, endY], drawWidth, c);
                startX = endX;
                startY = endY;
            }

            // chromeで描画中にマウスカーソルがIになってしまうのでその対策
            return false;
        });

        /**
         * Canvas MouseUp イベント
         */
        $('#cursorCanvas').mouseup(function (e) {
            'use strict';
            // console.log('mouse up');
            e.stopPropagation();
            if (isDisabled) return;

            drawFlag = false;
        });

        /**
         * Canvas MouseLeave イベント
         */
        $('#cursorCanvas').mouseleave(function (e) {
            'use strict';
            // console.log('mouse leave');
            e.stopPropagation();
            if (isDisabled) return;

            drawFlag = false;
        });

        /**
         * マウスポインタの位置にペン先を表示する
         */
        $('#cursorCanvas').mousemove(function (e) {
            'use strict';
            // console.log('mouse move');
            e.stopPropagation();
            if (isDisabled) return;

            startX = Math.round(e.pageX) - $('#mainCanvas').offset().left;
            startY = Math.round(e.pageY) - $('#mainCanvas').offset().top;

            drawCursor(startX, startY);
        });

        $('#cursorCanvas').mouseleave(function (e) {
            'use strict';
            // console.log('mouse leave');
            e.stopPropagation();

            cursorContext.clearRect(0, 0, $('#cursorCanvas').width(), $('#mainCanvas').height());
        });

        //------------------------------
        // その他 イベントハンドラ
        //------------------------------

        /**
         * 描くを選択
         */
        $('#brush').click(function () {
            'use strict';
            // console.log('#brush click');

            changeBrushMode();
        });

        /**
         * 消すを選択
         */
        $('#eraser').click(function () {
            'use strict';
            // console.log('#eraser click');

            changeEraserMode();
        });

        /**
         * すたを選択
         */
        $('#stamp').click(function () {
            'use strict';
            // console.log('#stamp click');

            changeStampMode();
        });

        /**
         * ブラシサイズ変更
         */
        $('#brushSize').on('slide', function (e) {
            'use strict';
            // console.log('#brushSize slide');

            drawWidth = this.value;
            drawPreview();
        }).on('slideStop', function (e) {
            'use strict';
            // console.log('#brushSize slideStop');

            // sliderをクリックで変更した場合にslideイベントでは変更後の値を取得できないためその対策
            var self = this;
            setTimeout(function () {
                drawWidth = self.value;
                drawPreview();
            }, 1);
        });

        /**
         * スタンプサイズ変更
         */
        $('#stampSize').on('slide', function (e) {
            'use strict';
            // console.log('#stampSize slide');

            drawScale = this.value;
            drawPreview();
        }).on('slideStop', function (e) {
            'use strict';
            // console.log('#stampSize slideStop');

            // sliderをクリックで変更した場合にslideイベントでは変更後の値を取得できないためその対策
            var self = this;
            setTimeout(function () {
                drawScale = self.value;
                drawPreview();
            }, 1);
        });

        /**
         * スタンプ角度変更
         */
        $('#stampAngle').on('slide', function (e) {
            'use strict';
            // console.log('#stampAngle slide');

            drawAngle = this.value;
            drawPreview();
        }).on('slideStop', function (e) {
            'use strict';
            // console.log('#stampAngle slideStop');

            // sliderをクリックで変更した場合にslideイベントでは変更後の値を取得できないためその対策
            var self = this;
            setTimeout(function () {
                drawAngle = self.value;
                drawPreview();
            }, 1);
        });

        /**
         * 上下・左右反転ボタンクリック
         */
        $('#vInversion').on('click', function () {
            'use strict';
            // console.log('#vInversion click');

            vInversionFactor *= -1;
            drawPreview();
        });
        $('#hInversion').on('click', function () {
            'use strict';
            // console.log('#hInversion click');

            hInversionFactor *= -1;
            drawPreview();
        });

        /**
         * スタンプの種類を選択
         */
        $('.radio-group').click(function () {
            'use strict';
            // console.log('.radio-group click');

            var stampId = '#' + $(this).attr('id');
            selectStamp(stampId);
        });

        /**
         * 全部消すボタンをクリック
         */
        $('#clear').on('click', function (e) {
            'use strict';
            // console.log('#clear click');
            e.stopPropagation();
            if (isDisabled) return;

            if (window.confirm('全部消しますか？')) {
                context.clearRect(0, 0, $('#mainCanvas').width(), $('#mainCanvas').height());
            }
        });

        /**
         * 投稿するボタンをクリック
         */
        $('#post').on('click', function (e) {
            'use strict';
            // console.log('#post click');
            e.stopPropagation();
            if (isDisabled) return;

            var input = window.prompt('名前を入力してください(' + NAME_LENGTH_LIMIT + '文字以内)', author);
            if (!input) {
                return;
            } else if (input.trim().length > NAME_LENGTH_LIMIT) {
                alert('名前は' + NAME_LENGTH_LIMIT + '文字以内で入力してください');
                return;
            } else if (input.trim() === '') {
                author = '名無しさん';
            } else {
                author = input.trim();
            }

            // 描画不可
            isDisabled = true;

            // Canvasを合成
            combineCanvases();

            // 送信
            var data = {
                png:          getPng(),
                thumbnailPng: getThumbnailPng(),
                author:       author,
            };
            socket.emit('post_comic', data, function (res) {
                'use strict';
                // console.log('post_comic callback');

                if (res.result === 'ok') {
                    alert('投稿しました\n続けて描きたい場合はページをリロードしてください');
                    setTweetButton(res.fileName);
                } else {
                    alert('エラーが発生しました');
                    isDisabled = false;
                }
            });
        });

        /**
         * ドラッグ禁止
         */
        $('body').on('dragstart', function () {
            'use strict';
            // console.log('body dragstart');

            return false;
        });

        /**
         * ツールメニューのフロート処理
         */
        $(window).scroll(function() {
            'use strict';
            // console.log('window scroll');

            if ($('#fixMenu').hasClass('active')) return;

            clearTimeout($.data(this, 'scrollTimer'));
            $.data(this, 'scrollTimer', setTimeout(function () {
                var floating = $(".tool-area");
                var offset = $('#right').offset().top - 50;
                if ($(window).scrollTop() > offset) {
                    floating.stop().animate({
                        marginTop: $(window).scrollTop() - offset
                    });
                } else {
                    floating.stop().animate({
                        marginTop: 0
                    });
                };
            }, 100));
        });

        /**
         * キーボードショートカット
         */
        $(window).keyup(function (e) {
            'use strict';
            // console.log('window keyup ' + e.keyCode);

            // スタンプの種類
            if (49 <= e.keyCode && e.keyCode <= 57) {
                var stampId = '#stamp' + (e.keyCode - 48);
                selectStamp(stampId);
            }
        });

        //------------------------------
        // 関数
        //------------------------------

        /**
         * 描く、消す、すたの選択状況を取得する
         */
        function getDrawMode () {
            'use strict';
            // console.log('getDrawMode');

            return $('.btn-group > label.active > input[name=tools]').val();
        }

        /**
         * 描画モードをブラシに変更する
         */
        function changeBrushMode () {
            'use strict';
            // console.log('changeBrushMode');

            $('#brushSize').slider('enable');
            $('#stampSize').slider('disable');
            $('#stampAngle').slider('disable');

            $('#vInversion').attr('disabled', 'disabled');
            $('#hInversion').attr('disabled', 'disabled');

            context.globalCompositeOperation = 'source-over';
            drawPreview('brush');
        }

        /**
         * 描画モードを消しゴムに変更する
         */
        function changeEraserMode () {
            'use strict';
            // console.log('changeEraserMode');

            $('#brushSize').slider('enable');
            $('#stampSize').slider('disable');
            $('#stampAngle').slider('disable');

            $('#vInversion').attr('disabled', 'disabled');
            $('#hInversion').attr('disabled', 'disabled');

            context.globalCompositeOperation = 'destination-out';
            drawPreview('eraser');
        }

        /**
         * 描画モードをスタンプに変更する
         */
        function changeStampMode () {
            'use strict';
            // console.log('changeStampMode');

            $('#brushSize').slider('disable');
            $('#stampSize').slider('enable');
            $('#stampAngle').slider('enable');

            $('#vInversion').removeAttr('disabled');
            $('#hInversion').removeAttr('disabled');

            context.globalCompositeOperation = 'source-over';
            // hack : 初回表示時にpreviewが表示されないことがあるためとりあえずsetTimeoutで遅延させて対策
            setTimeout(function () { drawPreview('stamp'); }, 1);
        }

        /**
         * スタンプの種類を変更
         */
        function selectStamp (stampId) {
            'use strict';
            // console.log('selectStamp');

            $('.radio-group').removeClass('selected');
            $(stampId).addClass('selected');

            // スタンプ選択時はモードもスタンプに切り替える
            $('.btn-group>label').removeClass('active');
            $('#stamp').addClass('active');

            // 線を描画中に切り替えた場合は描画を中断させる
            drawFlag = false;

            changeStampMode();
            drawCursor(startX, startY);
        }

        /**
         * ブラシサイズ変更時に表示を更新する
         */
        function drawPreview (forcedMode) {
            'use strict';
            // console.log('drawPreview');

            previewContext.clearRect(0, 0, $('#previewCanvas').width(), $('#previewCanvas').height());

            var x = Math.floor($('#previewCanvas').width() / 2);
            var y = Math.floor($('#previewCanvas').height() / 2);

            var mode = getDrawMode();
            // ボタンの状態変更がclickイベントの後なのでclickイベントから呼ぶときは引数で直接指定する
            if (typeof forcedMode !== 'undefined') mode = forcedMode;
            if (mode === 'brush' || mode === 'eraser') {
                // IEとChromeではlineToで点を描画できないようなので、多少ぼやけるがarcを使う。
                // 見た目がカクカクするのでoffset調整しない
                previewContext.fillStyle = '#000000';
                previewContext.beginPath();
                previewContext.arc(x, y, drawWidth / 2, 0, Math.PI * 2, false);
                previewContext.fill();
            } else if (mode === 'stamp') {
                // scale()は座標指定にも影響するっぽい
                var translateOffset = previewCanvas.width / 2;
                var hInvDrawScale = drawScale * hInversionFactor;
                var vInvDrawScale = drawScale * vInversionFactor;
                x = x / hInvDrawScale - stampSize / 2;
                y = y / vInvDrawScale - stampSize / 2;
                previewContext.save();
                previewContext.translate(translateOffset, translateOffset);
                previewContext.rotate(Math.PI * drawAngle);
                previewContext.translate(-translateOffset, -translateOffset);
                previewContext.scale(hInvDrawScale, vInvDrawScale);
                previewContext.drawImage($('.radio-group.selected')[0], x, y);
                previewContext.restore();
            } else {
                console.log('unknown mode : ' + mode);
                alert('エラーが発生しました');
            }
        }

        /**
         * ペン先表示
         */
        function drawCursor (x, y) {
            'use strict';
            // console.log('drawCursor');

            cursorContext.clearRect(0, 0, $('#cursorCanvas').width(), $('#mainCanvas').height());

            var mode = getDrawMode();
            if (mode === 'brush' || mode === 'eraser') {
                if (mode === 'brush') {
                    cursorContext.lineWidth = 0;
                    cursorContext.strokeStyle = color;
                    cursorContext.fillStyle = color;
                } else {
                    cursorContext.lineWidth = 1;
                    cursorContext.strokeStyle = color;
                    cursorContext.fillStyle = '#ffffff';
                }
                cursorContext.beginPath();
                cursorContext.arc(startX, startY, drawWidth / 2, 0, Math.PI * 2, false);
                cursorContext.stroke();
                cursorContext.fill();
            } else if (mode === 'stamp') {
                // scale()は座標指定にも影響するっぽい
                var hInvDrawScale = drawScale * hInversionFactor;
                var vInvDrawScale = drawScale * vInversionFactor;
                var drawX = startX / hInvDrawScale - stampSize / 2;
                var drawY = startY / vInvDrawScale - stampSize / 2;
                cursorContext.save();
                cursorContext.translate(startX, startY);
                cursorContext.rotate(Math.PI * drawAngle);
                cursorContext.translate(-startX, -startY);
                cursorContext.scale(hInvDrawScale, vInvDrawScale);
                cursorContext.drawImage($('.radio-group.selected')[0], drawX, drawY);
                cursorContext.restore();
            } else {
                console.log('unknown mode : ' + mode);
                alert('エラーが発生しました');
            }
        }

        /**
         * Canvas 線分を描画する
         */
        function drawLine (x, y, width, color) {
            'use strict';
            // console.log('drawLine');

            var offset = drawWidth % 2 === 0 ? 0 : 0.5;
            context.strokeStyle = color;
            context.fillStyle = color;
            context.lineWidth = width;
            context.beginPath();
            context.moveTo(x[0] - offset, y[0] - offset);
            for (var i = 1; i < x.length; i += 1) {
                context.lineTo(x[i] - offset, y[i] -offset);
            }
            context.stroke();
        }

        /**
         * Canvas 点を描画する
         */
        function drawPoint (x, y, width, color) {
            'use strict';
            // console.log('drawPoint');

            // IEとChromeではlineToで点を描画できないようなので、多少ぼやけるがarcを使う。
            context.strokeStyle = color;
            context.fillStyle = color;
            context.beginPath();
            context.arc(x, y, width / 2, 0, Math.PI * 2, false);
            context.fill();
        }

        /**
         * Canvas スタンプを描画する
         */
        function drawStamp(x, y) {
            'use strict';
            // console.log('drawStamp');

            // scale()は座標指定にも影響するっぽい
            var hInvDrawScale = drawScale * hInversionFactor;
            var vInvDrawScale = drawScale * vInversionFactor;
            var drawX = x / hInvDrawScale - stampSize / 2;
            var drawY = y / vInvDrawScale - stampSize / 2;
            context.save();
            context.translate(x, y);
            context.rotate(Math.PI * drawAngle);
            context.translate(-x, -y);
            context.scale(hInvDrawScale, vInvDrawScale);
            context.drawImage($('.radio-group.selected')[0], drawX, drawY);
            context.restore();
        }

        /**
         * 投稿用にCanvasを結合する
         */
        function combineCanvases () {
            'use strict';
            // console.log('combineCanvases');

            var width = combinationCanvas.width;
            var height = combinationCanvas.height;
            combinationContext.clearRect(0, 0, width, height);
            combinationContext.drawImage(frameCanvas, 0, 0, width, height);
            combinationContext.drawImage(canvas, 0, 0, width, height);
        }

        /**
         * 画像DataUrl取得メソッド
         */
        function getPng () {
            'use strict';
            // console.log('getPng');

            var dataUrl = combinationCanvas.toDataURL('image/png');
            return dataUrl.split(',')[1];
        }

        /**
         * サムネイル画像DataUrl取得メソッド
         */
        function getThumbnailPng () {
            'use strict';
            // console.log('getThumbnailPng');

            var thumbnailCanvas = document.createElement('canvas');
            thumbnailCanvas.width = thumbnailWidth;
            thumbnailCanvas.height = thumbnailHeight;
            var thumbnailContext = thumbnailCanvas.getContext('2d');
            thumbnailContext.drawImage(
                combinationCanvas,
                0, 0, thumbnailSourceWidth, thumbnailSourceHeight,
                0, 0, thumbnailWidth, thumbnailHeight);

            var dataUrl = thumbnailCanvas.toDataURL('image/png');
            return dataUrl.split(',')[1];
        }

        /**
         * ツイートボタンの設定
         */
        function setTweetButton (fileName) {
            'use strict';
            // console.log('setTweetButton');

            $('#tweetButtonWrapper').html('');

            var hashtag = encodeURIComponent(twitterHashtag);
            var text    = encodeURIComponent(!fileName ? twitterTextBeforePost : twitterTextAfterPost);
            var dataUrl = !fileName ? location.href : location.href + 'c/' + fileName + '.png';

            var buttonHtml = htmlbase.replace(/\{hashtag\}/g, hashtag)
                             .replace('{text}', text).replace('{data-url}', dataUrl);

            $('#tweetButtonWrapper').html(buttonHtml);

            if (typeof fileName !== 'undefined') {
                twttr.widgets.load();
            } else {
                // ページ読み込み時はload()の読み込みに失敗するようなので遅延させる
                setTimeout(function () { twttr.widgets.load(); }, 3000);
            }
        }
    });
})();
