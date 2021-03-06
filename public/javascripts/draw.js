(function () {
    'use strict';

    $(document).ready(function () {
        'use strict';

        //------------------------------
        // 定数
        //------------------------------

        var RESULT_OK        = 'ok';
        var RESULT_BAD_PARAM = 'bad param';

        var AUTHOR_KEY = "author";

        var NAME_LENGTH_LIMIT = 30;

        // サムネイルのサイズ
        var THUMBNAIL_WIDTH         = 250;
        var THUMBNAIL_HEIGHT        = 175;
        var THUMBNAIL_SOURCE_WIDTH  = 500;
        var THUMBNAIL_SOURCE_HEIGHT = 350;

        // スタンプの元の画像のサイズ(正方形を想定)
        var STAMP_SIZE = 250;

        // slider
        var BRUSH_SIZE_MIN   = 1;
        var BRUSH_SIZE_MAX   = 20;
        var BRUSH_SIZE_STEP  = 1;
        var STAMP_SIZE_MIN   = 0.01;
        var STAMP_SIZE_MAX   = 2;
        var STAMP_SIZE_STEP  = 0.01;
        var STAMP_ANGLE_MIN  = -1;
        var STAMP_ANGLE_MAX  = 1;
        var STAMP_ANGLE_STEP = 0.01;
        var WHEEL_SCALE      = 5;

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
        var color      = 'rgba(0, 0, 0, 1)';
        var eraseColor = 'rgba(0, 0, 0, 1)';
        // サイズ初期値
        var initialDrawWidth = 3;
        var initialDrawScale = 0.5;
        var initialDrawAngle = 0;
        // 各モードのサイズ、角度の保存用
        var drawSizeBrush  = initialDrawWidth;
        var drawSizeEraser = initialDrawWidth;
        var drawSizeStamp  = initialDrawScale;
        var drawSizeWord   = initialDrawScale;
        var drawAngleStamp = initialDrawAngle;
        var drawAngleWord  = initialDrawAngle;
        // 描画する線の太さ
        var drawWidth = drawSizeBrush;
        // スタンプ描画倍率
        var drawScale = drawSizeStamp;
        // スタンプ回転
        var drawAngle = drawAngleStamp;
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

        // 履歴管理
        var history = new History(canvas, 10);

        // 操作可否フラグ
        var isDisabled = true;

        // 描いた人の名前
        var author = '名無しさん';

        // 文字
        var word = 'うどん';

        // ホイール操作用ショートカットキー
        var key_size_pressed     = false;
        var key_rotation_pressed = false;

        // ペンタブレットプラグイン
        var plugin;

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
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = '100px \'\'';

        cursorContext = cursorCanvas.getContext('2d');
        cursorContext.textAlign = 'center';
        cursorContext.textBaseline = 'middle';
        cursorContext.font = '100px \'\'';

        previewContext = previewCanvas.getContext('2d');
        previewContext.lineCap = 'round';
        previewContext.lineJoin = 'round';
        previewContext.textAlign = 'center';
        previewContext.textBaseline = 'middle';
        previewContext.font = '100px \'\'';

        // ツールメニューのフロート処理
        var followscrolling = new ATFollowScrolling({
            element : '#right'
        });
        followscrolling.load();

        // slider初期化
        $('#brushSize').slider({
            min: BRUSH_SIZE_MIN,
            max: BRUSH_SIZE_MAX,
            step: BRUSH_SIZE_STEP,
            value: drawWidth,
            tooltip: 'hide',
        });
        $('#stampSize').slider({
            min: STAMP_SIZE_MIN,
            max: STAMP_SIZE_MAX,
            step: STAMP_SIZE_STEP,
            value: drawScale,
            tooltip: 'hide',
        });
        $('#stampAngle').slider({
            min: STAMP_ANGLE_MIN,
            max: STAMP_ANGLE_MAX,
            step: STAMP_ANGLE_STEP,
            value: drawAngle,
            tooltip: 'hide',
        });
        changeStampMode();

        var image = new Image();
        image.src = '/images/frame.png';
        image.onload = function () {
            frameContext.drawImage(image, 0, 0);
        };

        // 確率でスタンプ画像を変更
        if (Math.random() * 100 < 3) changeStampSet();

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
         * Canvas mousedown/touchstart イベント
         */
        $('#canvases').on('mousedown touchstart', function (e) {
            'use strict';
            // console.log(e.type);
            e.stopPropagation();
            e.preventDefault();
            if (isDisabled) return;

            // 履歴管理用に描画する前の状態を保存する
            // MouseUpはcanvas外では発生しないためMouseDown時に取得する
            // hack : DataURLへの変換より効率のいい方法はないか？
            history.save();

            var point = e.type === 'touchstart' ? e.originalEvent.changedTouches[0] : e;
            startX = Math.round(point.pageX) - $('#mainCanvas').offset().left;
            startY = Math.round(point.pageY) - $('#mainCanvas').offset().top;

            var mode = getDrawMode();
            if (mode === 'brush' || mode === 'eraser') {
                drawFlag = true;
                var c = mode === 'brush' ? color : eraseColor;
                drawPoint(startX, startY, drawWidth * getPressure(), c);
            } else if (mode === 'stamp') {
                drawStamp(startX, startY);
            } else if (mode === 'word') {
                drawWord(startX, startY);
            } else {
                console.log('unknown mode : ' + mode);
                alert('エラーが発生しました');
            }
        });

        /**
         * Canvas mousemove/touchmove イベント
         */
        $('#canvases').on('mousemove touchmove', function (e) {
            'use strict';
            // console.log(e.type);
            e.stopPropagation();
            e.preventDefault();
            if (isDisabled) return;

            var point = e.type === 'touchmove' ? e.originalEvent.changedTouches[0] : e;
            var endX = Math.round(point.pageX) - $('#cursorCanvas').offset().left;
            var endY = Math.round(point.pageY) - $('#cursorCanvas').offset().top;

            if (drawFlag) {
                var c = getDrawMode() === 'brush' ? color : eraseColor;
                drawLine([startX, endX], [startY, endY], drawWidth * getPressure(), c);
            }

            startX = endX;
            startY = endY;

            // ポインタの位置にペン先を表示する
            drawCursor(endX, endY);
        });

        /**
         * Canvas mouseup/touchend イベント
         */
        $('#canvases').on('mouseup touchend', function (e) {
            'use strict';
            // console.log(e.type);
            e.stopPropagation();
            e.preventDefault();
            if (isDisabled) return;

            drawFlag = false;
        });

        /**
         * Canvas mouseleave/touchcancel/touchend/touchleave イベント
         * mouse/touch操作の終了、中断
         */
        $('#canvases').on('mouseleave touchcancel touchend touchleave', function (e) {
            'use strict';
            // console.log(e.type);
            e.stopPropagation();
            e.preventDefault();
            if (isDisabled) return;

            drawFlag = false;
            clearCursor();
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
         * 文字を選択
         */
        $('#word').click(function () {
            'use strict';
            // console.log('#word click');

            changeWordMode();
        });

        /**
         * ブラシサイズ変更
         */
        $('#brushSize').on('slide', function (e) {
            'use strict';
            // console.log('#brushSize slide');

            drawWidth = this.value;
            var mode = getDrawMode();
            if (mode === 'brush') {
                drawSizeBrush = drawWidth;
            } else if (mode === 'eraser') {
                drawSizeEraser = drawWidth;
            } else {
                alert('予期しないエラー');
            }
            drawPreview();
        }).on('slideStop', function (e) {
            'use strict';
            // console.log('#brushSize slideStop');

            // sliderをクリックで変更した場合にslideイベントでは変更後の値を取得できないためその対策
            var self = this;
            setTimeout(function () {
                drawWidth = self.value;
                var mode = getDrawMode();
                if (mode === 'brush') {
                    drawSizeBrush = drawWidth;
                } else if (mode === 'eraser') {
                    drawSizeEraser = drawWidth;
                } else {
                    alert('予期しないエラー');
                }
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
            var mode = getDrawMode();
            if (mode === 'stamp') {
                drawSizeStamp = drawScale;
            } else if (mode === 'word') {
                drawSizeWord = drawScale;
            } else {
                alert('予期しないエラー');
            }
            drawPreview();
        }).on('slideStop', function (e) {
            'use strict';
            // console.log('#stampSize slideStop');

            // sliderをクリックで変更した場合にslideイベントでは変更後の値を取得できないためその対策
            var self = this;
            setTimeout(function () {
                drawScale = self.value;
                var mode = getDrawMode();
                if (mode === 'stamp') {
                    drawSizeStamp = drawScale;
                } else if (mode === 'word') {
                    drawSizeWord = drawScale;
                } else {
                    alert('予期しないエラー');
                }
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
            var mode = getDrawMode();
            if (mode === 'stamp') {
                drawAngleStamp = drawAngle;
            } else if (mode === 'word') {
                drawAngleWord = drawAngle;
            } else {
                alert('予期しないエラー');
            }
            drawPreview();
        }).on('slideStop', function (e) {
            'use strict';
            // console.log('#stampAngle slideStop');

            // sliderをクリックで変更した場合にslideイベントでは変更後の値を取得できないためその対策
            var self = this;
            setTimeout(function () {
                drawAngle = self.value;
                var mode = getDrawMode();
                if (mode === 'stamp') {
                    drawAngleStamp = drawAngle;
                } else if (mode === 'word') {
                    drawAngleWord = drawAngle;
                } else {
                    alert('予期しないエラー');
                }
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
         * サイズラベル クリックで初期値に戻す
         */
        $('#brushSizeLabel').on('click', function (e) {
            'use strict';
            // console.log('#brushSizeLabel click');

            var mode = getDrawMode();
            if (mode === 'brush') {
                drawWidth = initialDrawWidth;
                drawSizeBrush = drawWidth;
                $('#brushSize').slider('setValue', drawWidth);
                drawPreview();
            } else if (mode === 'eraser') {
                drawWidth = initialDrawWidth;
                drawSizeEraser = drawWidth;
                $('#brushSize').slider('setValue', drawWidth);
                drawPreview();
            }
        });
        $('#stampSizeLabel').on('click', function (e) {
            'use strict';
            // console.log('#stampSizeLabel click');

            var mode = getDrawMode();
            if (mode === 'stamp') {
                drawScale = initialDrawScale;
                drawSizeStamp = drawScale;
                $('#stampSize').slider('setValue', drawScale);
                drawPreview();
            } else if (mode === 'word') {
                drawScale = initialDrawScale;
                drawSizeWord = drawScale;
                $('#stampSize').slider('setValue', drawScale);
                drawPreview();
            }
        });

        /**
         * 回転ラベル クリックで初期値に戻す
         */
        $('#stampAngleLabel').on('click', function (e) {
            'use strict';
            // console.log('#stampAngelLabel click');

            var mode = getDrawMode();
            if (mode === 'stamp') {
                drawAngle = 0;
                drawAngleStamp = drawAngle;
                $('#stampAngle').slider('setValue', drawAngle);
                drawPreview();
            } else if (mode === 'word') {
                drawAngle = 0;
                drawAngleWord = drawAngle;
                $('#stampAngle').slider('setValue', drawAngle);
                drawPreview();
            }
        });

        /**
         * Undoボタンをクリック
         */
        $('#undo').click(function () {
            'use strict';
            // console.log('#undo click');
            if (isDisabled) return;

            isDisabled = true;
            history.undo();
            isDisabled = false;
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
                history.clear();
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

            var storedAuthor = JSON.parse(localStorage.getItem(AUTHOR_KEY));
            if (storedAuthor) author = storedAuthor;

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

            localStorage.setItem(AUTHOR_KEY, JSON.stringify(author));

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
                    $('#post').css('display', 'none');
                    $('#clear').css('display', 'none');
                    $('#help').css('display', 'none');
                    setTweetButton(res.fileName);
                } else {
                    alert('エラーが発生しました');
                    isDisabled = false;
                }
            });
        });

        /**
         * 操作説明ボタンをクリック
         */
        $('#help').on('click', function () {
            'use strict';
            // console.log('#help click');

            $.colorbox({
                href: '/help',
                transition: 'none',
                closeButton: false,
                open: true,
                innerWidth: 300,
                innerHeight: 450,
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
         * キーボードショートカット
         */
        $(window).on('keydown keyup', function (e) {
            'use strict';
            // console.log('window ' + e.type + ' ' + e.keyCode);

            switch(e.keyCode) {
                case 82: // R
                    key_rotation_pressed = e.type === 'keydown';
                    break;
                case 83: // S
                    key_size_pressed = e.type === 'keydown';
                    break;
            }
        });
        $(window).keyup(function (e) {
            'use strict';
            // console.log('window keyup ' + e.keyCode);

            if (49 <= e.keyCode && e.keyCode <= 57) {
                // スタンプの種類 0-9
                var stampId = '#stamp' + (e.keyCode - 48);
                selectStamp(stampId);
            } else if (e.keyCode === 66) {
                // B
                changeBrushMode();
                $('.btn-group>label').removeClass('active');
                $('#brush').addClass('active');
            } else if (e.keyCode === 67) {
                // C
                changeWordMode();
                $('.btn-group>label').removeClass('active');
                $('#word').addClass('active');
            } else if (e.keyCode === 69) {
                // E
                changeEraserMode();
                $('.btn-group>label').removeClass('active');
                $('#eraser').addClass('active');
            } else if (e.keyCode === 72) {
                // H
                hInversionFactor *= -1;
                $('#hInversion').button('toggle');
                drawPreview();
            } else if (e.keyCode === 80) {
                // P 筆圧機能切替
                if (plugin) {
                    // console.log('pressure mode off');
                    $('#pentablet').html('');
                    plugin = null;
                } else {
                    // console.log('pressure mode on');
                    $('#pentablet').html('<object type="application/x-wacomtabletplugin"></object>');
                    plugin = document.querySelector('object[type="application/x-wacomtabletplugin"]');
                }
            } else if (e.keyCode === 86) {
                // V
                vInversionFactor *= -1;
                $('#vInversion').button('toggle');
                drawPreview();
            } else if (e.keyCode === 90) {
                // Z
                isDisabled = true;
                history.undo();
                isDisabled = false;
            }
        });
        $(window).on('wheel', function (e) {
            'use strict';
            // console.log('wheel');

            var delta = e.originalEvent.deltaY < 0 ? 1 : -1;
            var mode = getDrawMode();

            if (key_size_pressed) {
                e.preventDefault();
                if (mode === 'brush' || mode === 'eraser') {
                    var newWidth = Number(drawWidth) + delta * BRUSH_SIZE_STEP;
                    newWidth = Math.max(newWidth, BRUSH_SIZE_MIN);
                    newWidth = Math.min(newWidth, BRUSH_SIZE_MAX);
                    drawWidth = newWidth;
                    if (mode === 'brush') {
                        drawSizeBrush = drawWidth;
                    } else {
                        drawSizeEraser = drawWidth;
                    }
                    $('#brushSize').slider('setValue', drawWidth);
                    drawPreview();
                } else if (mode === 'stamp' || mode === 'word'){
                    var newScale = Number(drawScale) + delta * STAMP_SIZE_STEP * WHEEL_SCALE;
                    newScale = Math.max(newScale, STAMP_SIZE_MIN);
                    newScale = Math.min(newScale, STAMP_SIZE_MAX);
                    drawScale = newScale;
                    if (mode === 'stamp') {
                        drawSizeStamp = drawScale;
                    } else {
                        drawSizeWord = drawScale;
                    }
                    $('#stampSize').slider('setValue', drawScale);
                    drawPreview();
                } else {
                    alert('予期しないエラー');
                }
            } else if (key_rotation_pressed) {
                e.preventDefault();
                if (mode !== 'stamp' && mode !== 'word') return;

                var newAngle = Number(drawAngle) + delta * STAMP_ANGLE_STEP * WHEEL_SCALE;
                if (newAngle > STAMP_ANGLE_MAX) newAngle = STAMP_ANGLE_MIN;
                else if (newAngle < STAMP_ANGLE_MIN) newAngle = STAMP_ANGLE_MAX;
                drawAngle = newAngle;
                if (mode === 'stamp') {
                    drawAngleStamp = drawAngle;
                } else if (mode === 'word') {
                    drawAngleWord = drawAngle;
                } else {
                    alert('予期しないエラー');
                }
                $('#stampAngle').slider('setValue', drawAngle);
                drawPreview();
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

            drawWidth = drawSizeBrush;
            $('#brushSize').slider('setValue', Number(drawWidth));

            $('#brushSizeDiv').css('display', '');
            $('#stampSizeDiv').css('display', 'none');
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

            drawWidth = drawSizeEraser;
            $('#brushSize').slider('setValue', Number(drawWidth));

            $('#brushSizeDiv').css('display', '');
            $('#stampSizeDiv').css('display', 'none');
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

            drawScale = drawSizeStamp;
            drawAngle = drawAngleStamp;
            $('#stampSize').slider('setValue', Number(drawScale));
            $('#stampAngle').slider('setValue', Number(drawAngle));

            $('#brushSizeDiv').css('display', 'none');
            $('#stampSizeDiv').css('display', '');
            $('#stampAngle').slider('enable');

            $('#vInversion').removeAttr('disabled');
            $('#hInversion').removeAttr('disabled');

            context.globalCompositeOperation = 'source-over';
            // hack : 初回表示時にpreviewが表示されないことがあるためとりあえずsetTimeoutで遅延させて対策
            setTimeout(function () { drawPreview('stamp'); }, 1);
        }

        /**
         * 描画モードを文字に変更する
         */
        function changeWordMode () {
            'use strict';
            // console.log('changeWordMode');

            var input = window.prompt('文字を入力してください', word);
            if (input != null && input.trim()) { word = input.trim(); }

            drawScale = drawSizeWord;
            drawAngle = drawAngleWord;
            $('#stampSize').slider('setValue', Number(drawScale));
            $('#stampAngle').slider('setValue', Number(drawAngle));

            $('#brushSizeDiv').css('display', 'none');
            $('#stampSizeDiv').css('display', '');
            $('#stampAngle').slider('enable');

            $('#vInversion').removeAttr('disabled');
            $('#hInversion').removeAttr('disabled');

            context.globalCompositeOperation = 'source-over';
            drawPreview('word');
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
            // hack : touchの場合は表示したくないが制御できるか？
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
                previewContext.fillStyle = '#000000';
                previewContext.beginPath();
                previewContext.arc(x, y, drawWidth / 2, 0, Math.PI * 2, false);
                previewContext.fill();
            } else if (mode === 'stamp') {
                // scale()は座標指定にも影響するっぽい
                var translateOffset = previewCanvas.width / 2;
                var hInvDrawScale = drawScale * hInversionFactor;
                var vInvDrawScale = drawScale * vInversionFactor;
                x = x / hInvDrawScale - STAMP_SIZE / 2;
                y = y / vInvDrawScale - STAMP_SIZE / 2;
                previewContext.save();
                previewContext.translate(translateOffset, translateOffset);
                previewContext.rotate(Math.PI * drawAngle);
                previewContext.translate(-translateOffset, -translateOffset);
                previewContext.scale(hInvDrawScale, vInvDrawScale);
                previewContext.drawImage($('.radio-group.selected')[0], x, y);
                previewContext.restore();
            } else if (mode === 'word') {
                // scale()は座標指定にも影響するっぽい
                var translateOffset = previewCanvas.width / 2;
                var hInvDrawScale = drawScale * hInversionFactor;
                var vInvDrawScale = drawScale * vInversionFactor;
                x = x / hInvDrawScale;
                y = y / vInvDrawScale;
                previewContext.save();
                previewContext.translate(translateOffset, translateOffset);
                previewContext.rotate(Math.PI * drawAngle);
                previewContext.translate(-translateOffset, -translateOffset);
                previewContext.scale(hInvDrawScale, vInvDrawScale);
                previewContext.fillStyle = color;
                previewContext.fillText(word, x, y);
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

            clearCursor();

            var mode = getDrawMode();
            if (mode === 'brush' || mode === 'eraser') {
                cursorContext.beginPath();
                cursorContext.arc(x, y, drawWidth / 2, 0, Math.PI * 2, false);
                if (plugin && plugin.penAPI && plugin.penAPI.isWacom) {
                    cursorContext.lineWidth = 1;
                    cursorContext.strokeStyle = color;
                    cursorContext.fillStyle = 'rgba(0,0,0,0)';
                    cursorContext.stroke();
                } else if (mode === 'brush') {
                    cursorContext.fillStyle = color;
                } else {
                    cursorContext.lineWidth = 1;
                    cursorContext.strokeStyle = color;
                    cursorContext.fillStyle = '#ffffff';
                    cursorContext.stroke();
                }
                cursorContext.fill();
            } else if (mode === 'stamp') {
                // scale()は座標指定にも影響するっぽい
                var hInvDrawScale = drawScale * hInversionFactor;
                var vInvDrawScale = drawScale * vInversionFactor;
                var drawX = x / hInvDrawScale - STAMP_SIZE / 2;
                var drawY = y / vInvDrawScale - STAMP_SIZE / 2;
                cursorContext.save();
                cursorContext.translate(x, y);
                cursorContext.rotate(Math.PI * drawAngle);
                cursorContext.translate(-x, -y);
                cursorContext.scale(hInvDrawScale, vInvDrawScale);
                cursorContext.drawImage($('.radio-group.selected')[0], drawX, drawY);
                cursorContext.restore();
            } else if (mode === 'word') {
                // scale()は座標指定にも影響するっぽい
                var hInvDrawScale = drawScale * hInversionFactor;
                var vInvDrawScale = drawScale * vInversionFactor;
                var drawX = x / hInvDrawScale;
                var drawY = y / vInvDrawScale;
                cursorContext.save();
                cursorContext.translate(x, y);
                cursorContext.rotate(Math.PI * drawAngle);
                cursorContext.translate(-x, -y);
                cursorContext.scale(hInvDrawScale, vInvDrawScale);
                cursorContext.fillStyle = color;
                cursorContext.fillText(word, drawX, drawY);
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

            context.strokeStyle = color;
            context.fillStyle = color;
            context.lineWidth = width;
            context.beginPath();
            context.moveTo(x[0], y[0]);
            context.lineTo(x[1], y[1]);
            context.stroke();
        }

        /**
         * Canvas 点を描画する
         */
        function drawPoint (x, y, width, color) {
            'use strict';
            // console.log('drawPoint');

            // IEとChromeではlineToで点を描画できないようなので、多少ぼやけるがarcを使う。
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
            var drawX = x / hInvDrawScale - STAMP_SIZE / 2;
            var drawY = y / vInvDrawScale - STAMP_SIZE / 2;
            context.save();
            context.translate(x, y);
            context.rotate(Math.PI * drawAngle);
            context.translate(-x, -y);
            context.scale(hInvDrawScale, vInvDrawScale);
            context.drawImage($('.radio-group.selected')[0], drawX, drawY);
            context.restore();
        }

        /**
         * Canvas 文字を描画する
         */
        function drawWord (x, y) {
            'use strict';
            // console.log('drawWord');

            var hInvDrawScale = drawScale * hInversionFactor;
            var vInvDrawScale = drawScale * vInversionFactor;
            var drawX = x / hInvDrawScale;
            var drawY = y / vInvDrawScale;
            context.save();
            context.translate(x, y);
            context.rotate(Math.PI * drawAngle);
            context.translate(-x, -y);
            context.scale(hInvDrawScale, vInvDrawScale);
            context.fillStyle = color;
            context.fillText(word, drawX, drawY);
            context.restore();
        }

        /**
         * CursorCanvas クリア
         */
        function clearCursor () {
            'use strict';
            // console.log('clearCursor');

            cursorContext.clearRect(0, 0, $('#cursorCanvas').width(), $('#cursorCanvas').height());
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
            thumbnailCanvas.width = THUMBNAIL_WIDTH;
            thumbnailCanvas.height = THUMBNAIL_HEIGHT;
            var thumbnailContext = thumbnailCanvas.getContext('2d');
            thumbnailContext.drawImage(
                combinationCanvas,
                0, 0, THUMBNAIL_SOURCE_WIDTH, THUMBNAIL_SOURCE_HEIGHT,
                0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

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
            var text    = encodeURIComponent(twitterTextAfterPost);
            var dataUrl = location.origin + '/view/' + fileName;

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

        /**
         * 筆圧取得
         */
        function getPressure () {
            'use strict';
            // console.log('getPressure');

            // 筆圧取得
            if (plugin && plugin.penAPI && plugin.penAPI.isWacom) {
                return plugin.penAPI.pressure;
            } else {
                return 1;
            }
        }

        /**
         * スタンプ画像変更
         */
        function changeStampSet () {
            'use strict';
            // console.log('changeStampSet');

            $('.radio-group').each(function () {
                $(this).attr('id').match(/stamp(\d+)/);
                $(this).attr('src', '/images/stamp' + RegExp.$1 + 'b.png');
            });
        }
    });

    // 履歴管理クラス
    var History = (function () {
        'use strict';

        function History(canvas, length) {
            'use strict';

            this.canvas  = canvas;
            this.context = canvas.getContext('2d');
            this.length  = length;
            this.images  = [];
        }

        History.prototype.save = function () {
            'use strict';
            // console.log('History.save');

            this.images.push(this.canvas.toDataURL());
            if (this.images.length > this.length) this.images.shift();
        };

        History.prototype.undo = function () {
            'use strict';
            // console.log('History.undo');

            if (this.images.length === 0) return;

            var self = this;
            var image = new Image();
            image.src = this.images.pop();
            image.onload = function () {
                self.context.save();
                self.context.globalCompositeOperation = 'source-over';
                self.context.clearRect(0, 0, self.canvas.width, self.canvas.height);
                self.context.drawImage(image, 0, 0);
                self.context.restore();
            };
        };

        History.prototype.clear = function () {
            'use strict';
            // console.log('History.clear');

            this.images.length = 0;
        };

        return History;
    })();
})();
