var fs      = require('fs');
var log4js  = require('log4js');
var logger  = log4js.getLogger('sta4koma');
var Promise = require('es6-promise').Promise;
var server  = require('../server.js');
var db      = require('./db.js');

var RESULT_OK           = 'ok';
var RESULT_BAD_PARAM    = 'bad param';
var RESULT_SYSTEM_ERROR = 'system error';

var TYPE_UNDEFINED = 'undefined';

var NAME_LENGTH_LIMIT = 30;

exports.onConnection = function (client) {
    'use strict';
    logger.debug('connected : ' + client.id);

    client.emit('connected');

    /**
     * 描いた絵を受け取る
     */
    client.on('post_comic', function (data, callback) {
        'use strict';
        logger.debug('post_comic : ' + client.id);
        // logger.trace(data);

        if (isUndefinedOrNull(data) ||
            isUndefinedOrNull(data.author) || !checkParamLength(data.author, 0, NAME_LENGTH_LIMIT)) {
            logger.warn('post_comic : ' + client.id + ' : ' + RESULT_BAD_PARAM);
            callback({ result: RESULT_BAD_PARAM });
            return;
        }

        // 画像を保存
        saveImage(data.png, data.thumbnailPng).then(function (imageFileName) {
            if (!imageFileName) {
                logger.error('post_comic failed : ' + client.id);
                callback({ result: RESULT_SYSTEM_ERROR });
                return;
            }

            var comic = new db.Comic();
            comic.author = data.author;
            comic.fileName = imageFileName;
            comic.registeredTime = new Date();
            comic.updatedTime = comic.registeredTime;
            comic.isDeleted = false;

            comic.save(function (err, doc) {
                if (err) {
                    logger.error(err);
                    callback({ result: RESULT_SYSTEM_ERROR });
                    return;
                }
                callback({
                    result:   RESULT_OK,
                    fileName: doc.fileName,
                });
                return;
            });
        }).catch(function (err) {
            logger.error(err);
            callback({ result: RESULT_SYSTEM_ERROR });
            return;
        });
    });

    /**
     * socket切断時の処理
     */
    client.on('disconnect', function() {
        'use strict';
        logger.debug('disconnect : ' + client.id);
    });

    //------------------------------
    // メソッド定義
    //------------------------------

    /**
     * 画像をファイルに保存
     */
    function saveImage (png, thumbnailPng) {
        'use strict';
        logger.debug('saveImage');

        return new Promise(function (fulfill, reject) {
            if (!png || !thumbnailPng) {
                logger.error(err);
                reject(new Error('bad param'));
                return;
            }

            // todo : PNGフォーマットチェック

            var filename = new Date().getTime();

            // 原寸の画像を保存
            var buf = new Buffer(png, 'base64');
            var path = './public/c/' + filename + '.png';
            fs.writeFile(path, buf, function (err) {
                if (err) {
                    logger.error(err);
                    reject(new Error('save image failed'));
                    return;
                }

                // サムネイル画像を保存
                buf = new Buffer(thumbnailPng, 'base64');
                path = './public/c/thumb/' + filename + '.thumb.png';
                fs.writeFile(path, buf, function (err) {
                    if (err) {
                        logger.error(err);
                        reject(new Error('save thumbnail image failed'));
                        return;
                    }
                    fulfill(filename);
                    return;
                });
            });
        });
    }
};

//------------------------------
// メソッド定義
//------------------------------

/**
 * nullとundefinedのチェック
 */
function isUndefinedOrNull(data) {
    'use strict';

    return typeof data === TYPE_UNDEFINED || data === null;
}

/**
 * 文字数のチェック
 */
function checkParamLength(data, minLength, maxLength) {
    'use strict';

    return minLength <= data.length && data.length <= maxLength;
}
