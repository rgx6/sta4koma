var log4js = require('log4js');
var logger = log4js.getLogger('appLog');
var db     = require('../sockets/db.js');
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
var msgNotFound    = '(´・ω・｀)そんなページないよ';

// エラーコード
var RESULT_OK           = 'ok';
var RESULT_BAD_PARAM    = 'bad param';
var RESULT_SYSTEM_ERROR = 'system error';

//------------------------------
// routing
//------------------------------

exports.index = function (req, res) {
    'use strict';

    var query = db.Comic
            .find({ isDeleted: false })
            .select({ fileName: 1, _id: 0 })
            .limit(100)
            .sort({ fileName: 'desc' });
    query.exec(function (err, comics) {
        if (err) {
            logger.error(err);
            res.status(500).render('error', {
                title:   APP_TITLE,
                message: msgSystemError,
            });
            return;
        }

        var randomIndex = Math.floor(Math.random() * comics.length);
        res.render('index', {
            title: APP_TITLE,
            fileName: comics[randomIndex].fileName,
        });
    });
};

exports.draw = function (req, res) {
    'use strict';

    res.render('draw', {
        title: APP_TITLE
    });
};

exports.list = function (req, res) {
    'use strict';

    res.render('list', {
        title: APP_TITLE
    });
};

exports.view = function (req, res) {
    'use strict';

    var fileName = req.params.fileName;

    if (isUndefinedOrNull(fileName) || !fileName.match(/^[1-9][0-9]*$/)) {
        res.status(400).render('error', {
            title:   APP_TITLE,
            message: msgInvalidUrl,
        });
        return;
    }

    var query = db.Comic.findOne({ fileName: fileName }).select({ author: 1, isDeleted: 1, _id: 0 });
    query.exec(function (err, comic) {
        if (err) {
            logger.error(err);
            res.status(500).render('error', {
                title:   APP_TITLE,
                message: msgSystemError,
            });
            return;
        }
        if (comic === null) {
            logger.warn('file not found : ' + fileName);
            res.status(404).render('error', {
                title:   APP_TITLE,
                message: msgNotFound,
            });
            return;
        }
        if (comic.isDeleted) {
            logger.warn('deleted file : ' + fileName);
            res.status(404).render('error', {
                title:   APP_TITLE,
                message: msgNotFound,
            });
            return;
        }

        res.render('view', {
            title:    APP_TITLE,
            fileName: fileName,
            author:   comic.author,
        });
    });
};

exports.apiList = function (req, res) {
    'use strict';

    var page = req.params.page;

    if (isUndefinedOrNull(page)) {
        page = 1;
    } else if (!page.match(/^[1-9][0-9]*$/)) {
        res.status(400).json({ result: RESULT_BAD_PARAM });
        return;
    }

    var query = db.Comic.count({ isDeleted: false });
    query.exec(function (err, count) {
        if (err) {
            logger.error(err);
            res.status(500).json({ result: RESULT_SYSTEM_ERROR });
            return;
        }

        if (count === 0) {
            res.status(200).json({
                result: RESULT_OK,
                comics: [],
            });
            return;
        }

        var query = db.Comic
                .find({ isDeleted: false })
                .select({ fileName: 1, author: 1, registeredTime: 1, _id: 0 })
                .limit(ITEMS_PER_LOG_PAGE)
                .skip((page - 1) * ITEMS_PER_LOG_PAGE)
                .sort({ fileName: 'desc' });
        query.exec(function (err, comics) {
            if (err) {
                logger.error(err);
                res.status(500).json({ result: RESULT_SYSTEM_ERROR });
                return;
            }

            res.status(200).json({
                result:       RESULT_OK,
                comics:       comics,
                items:        count,
                itemsPerPage: ITEMS_PER_LOG_PAGE,
            });
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
