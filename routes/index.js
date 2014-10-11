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

exports.set = function (appRoot, app) {
    app.get(appRoot, index);
    app.get(appRoot + 'draw', draw);
    app.get(appRoot + 'list', list);
    app.get(appRoot + 'list/:page', list);
    app.get(appRoot + 'view/:fileName', view);
    app.get(appRoot + 'help', help);
    app.get(appRoot + 'api/list/:page/:author?', apiList);
    app.get(appRoot + 'api/view/next/:fileName/:author?', apiViewGetNext);
    app.get(appRoot + 'api/view/prev/:fileName/:author?', apiViewGetPrev);
    app.get(appRoot + 'api/good/:fileName', apiGetGood);
    app.post(appRoot + 'api/good', apiPostGood);
};

var index = function (req, res) {
    'use strict';

    var query = db.Comic.count({ isDeleted: false });
    query.exec(function (err, count) {
        if (err) {
            logger.error(err);
            res.status(500).render('error', {
                title:   APP_TITLE,
                message: msgSystemError,
            });
            return;
        }

        var randomIndex = Math.floor(Math.random() * count);

        var query = db.Comic
                .findOne({ isDeleted: false })
                .select({ fileName: 1, _id: 0 })
                .skip(randomIndex)
                .sort({ fileName: 'desc' });
        query.exec(function (err, comic) {
            if (err) {
                logger.error(err);
                res.status(500).render('error', {
                    title:   APP_TITLE,
                    message: msgSystemError,
                });
                return;
            }

            var fileName = comic ? comic.fileName : '';
            res.render('index', {
                title:    APP_TITLE,
                fileName: fileName,
            });
        });
    });
};

var draw = function (req, res) {
    'use strict';

    res.render('draw', {
        title: APP_TITLE
    });
};

var list = function (req, res) {
    'use strict';

    res.render('list', {
        title: APP_TITLE
    });
};

var view = function (req, res) {
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

var help = function (req, res) {
    'use strict';

    res.render('help', {
        title: APP_TITLE
    });
};

var apiList = function (req, res) {
    'use strict';

    var page = req.params.page;
    var author = req.params.author;

    if (isUndefinedOrNull(page)) {
        page = 1;
    } else if (!page.match(/^[1-9][0-9]*$/)) {
        res.status(400).json({ result: RESULT_BAD_PARAM });
        return;
    }

    var query;
    if (author) {
        query = db.Comic.count({ isDeleted: false, author: author });
    } else {
        query = db.Comic.count({ isDeleted: false });
    }
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

        var query;
        if (author) {
            query = db.Comic
                .find({ isDeleted: false, author: author })
                .select({ fileName: 1, author: 1, registeredTime: 1, _id: 0 })
                .limit(ITEMS_PER_LOG_PAGE)
                .skip((page - 1) * ITEMS_PER_LOG_PAGE)
                .sort({ fileName: 'desc' });
        } else {
            query = db.Comic
                .find({ isDeleted: false })
                .select({ fileName: 1, author: 1, registeredTime: 1, _id: 0 })
                .limit(ITEMS_PER_LOG_PAGE)
                .skip((page - 1) * ITEMS_PER_LOG_PAGE)
                .sort({ fileName: 'desc' });
        }
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

var apiViewGetNext = function (req, res) {
    'use strict';

    var fileName = req.params.fileName;
    var author = req.params.author;

    if (isUndefinedOrNull(fileName) || !fileName.match(/^[1-9][0-9]*$/)) {
        res.status(400).json({ result: RESULT_BAD_PARAM });
        return;
    }

    var query;
    if (author) {
        query = db.Comic
            .findOne({ isDeleted: false, fileName: { $lt: fileName }, author: author })
            .select({ fileName: 1, _id: 0 })
            .sort({ fileName: 'desc' });
    } else {
        query = db.Comic
            .findOne({ isDeleted: false, fileName: { $lt: fileName } })
            .select({ fileName: 1, _id: 0 })
            .sort({ fileName: 'desc' });
    }
    query.exec(function (err, comic) {
        if (err) {
            logger.error(err);
            res.status(500).json({ result: RESULT_SYSTEM_ERROR });
            return;
        }

        res.status(200).json({
            result:   RESULT_OK,
            fileName: comic ? comic.fileName : null,
        });
    });
};

var apiViewGetPrev = function (req, res) {
    'use strict';

    var fileName = req.params.fileName;
    var author = req.params.author;

    if (isUndefinedOrNull(fileName) || !fileName.match(/^[1-9][0-9]*$/)) {
        res.status(400).json({ result: RESULT_BAD_PARAM });
        return;
    }

    var query;
    if (author) {
        query = db.Comic
            .findOne({ isDeleted: false, fileName: { $gt: fileName }, author: author })
            .select({ fileName: 1, _id: 0 })
            .sort({ fileName: 'asc' });
    } else {
        query = db.Comic
            .findOne({ isDeleted: false, fileName: { $gt: fileName } })
            .select({ fileName: 1, _id: 0 })
            .sort({ fileName: 'asc' });
    }
    query.exec(function (err, comic) {
        if (err) {
            logger.error(err);
            res.status(500).json({ result: RESULT_SYSTEM_ERROR });
            return;
        }

        res.status(200).json({
            result:   RESULT_OK,
            fileName: comic ? comic.fileName : null,
        });
    });
};

var apiGetGood = function (req, res) {
    'use strict';

    var fileName = req.params.fileName;
    if (isUndefinedOrNull(fileName) || !fileName.match(/^[1-9][0-9]*$/)) {
        res.status(400).json({ result: RESULT_BAD_PARAM });
        return;
    }

    var query = db.Good.count({ fileName: fileName });
    query.exec(function (err, count) {
        if (err) {
            logger.error(err);
            res.status(500).json({ result: RESULT_SYSTEM_ERROR });
            return;
        }

        res.status(200).json({
            result: RESULT_OK,
            count:  count,
        });
    });
};

var apiPostGood = function (req, res) {
    'use strict';

    var fileName = req.body['fileName'];
    if (isUndefinedOrNull(fileName) || !fileName.match(/^[1-9][0-9]*$/)) {
        res.status(400).json({ result: RESULT_BAD_PARAM });
        return;
    }

    var userId = req.body['userId'];
    if (isUndefinedOrNull(userId)) {
        res.status(400).json({ result: RESULT_BAD_PARAM });
        return;
    }

    var query = db.Good.count({ fileName: fileName, userId: userId });
    query.exec(function (err, count) {
        if (err) {
            logger.error(err);
            res.status(500).json({ result: RESULT_SYSTEM_ERROR });
            return;
        }

        if (count > 0) {
            res.status(200).json({
                result:  RESULT_OK,
                updated: false,
            });
            return;
        }

        var good = new db.Good();
        good.fileName       = fileName;
        good.userId         = userId;
        good.registeredTime = new Date();
        good.save(function (err, doc) {
            if (err) {
                logger.error(err);
                res.status(500).json({ result: RESULT_SYSTEM_ERROR });
                return;
            }

            res.status(200).json({
                result:  RESULT_OK,
                updated: true,
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
