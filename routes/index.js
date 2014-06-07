var log4js = require('log4js');
var logger = log4js.getLogger('sta4koma');
var db = require('../sockets/db.js');
var staApp = require('../sockets/app.js');

//------------------------------
// 定数
//------------------------------

var APP_TITLE = '4コマすたちゅーさん';

var TYPE_UNDEFINED = 'undefined';

var ITEMS_PER_LOG_PAGE = 20;

// エラーメッセージ
var msgSystemError = '(´・ω・｀)システムエラー';
var msgInvalidUrl  = '(´・ω・｀)不正なURL';

//------------------------------
// routing
//------------------------------

exports.index = function (req, res) {
    'use strict';

    res.render('index', {
        title: APP_TITLE
    });
};

exports.list = function (req, res) {
    'use strict';

    var page = req.params.page;

    if (isUndefinedOrNull(page) || !page.match(/^[1-9][0-9]*$/)) {
        res.status(400).render('error', {
            title:   APP_TITLE,
            message: msgInvalidUrl,
        });
        return;
    }

    var query = db.Comic.find({ isDeleted: false }).sort({ fileName: 'desc' });
    query.exec(function (err, comics) {
        if (err) {
            logger.error(err);
            res.status(500).render('error', {
                title:   APP_TITLE,
                message: msgSystemError,
            });
            return;
        }

        var totalPageCount = Math.ceil(comics.length / ITEMS_PER_LOG_PAGE);
        if (page < 1 || totalPageCount < page) {
            res.status(400).render('error', {
                title:   APP_TITLE,
                message: msgInvalidUrl,
            });
            return;
        }

        var comicList = comics.map(function (x) {
            return {
                fileName: x.fileName,
                author: x.author,
            };
        });

        // ページング処理
        var startIndex = ITEMS_PER_LOG_PAGE * (page - 1);
        var endIndex = page == totalPageCount ? comicList.length : ITEMS_PER_LOG_PAGE * page;
        var dispComicList = comicList.slice(startIndex, endIndex);

        res.render('list', {
            comics:         dispComicList,
            page:           page,
            totalPageCount: totalPageCount,
        });
    });
};

//------------------------------
// 関数
//------------------------------

/**
 * nullとundefinedのチェック
 */
function isUndefinedOrNull(data) {
    'use strict';

    return typeof data === TYPE_UNDEFINED || data === null;
}
