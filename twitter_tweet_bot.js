var Twit    = require('twit');
var Promise = require('es6-promise').Promise;
var cron    = require('cron').CronJob;
var log4js  = require('log4js');
var db      = require('./sockets/db.js');
var config  = require('./twitter_configuration.js');

log4js.configure('log4js_configuration.json', { reloadSecs: 60 });

var logger = log4js.getLogger('twitterlog');

var comicListUrl = 'http://sta4koma.rgx6.com/list';
var messagePrefix = [
    'ちゅー',
    'ちゅー？',
    'ちゅー！',
    'ぷぇー',
    'ぷぇー？',
];
var messageSuffix = '(4コマまんがが{count}本投稿されました)({time}時台) {url} {hashtag}';
var hashtag = '#すた4コマ';

var twit;

var lastCheckedTime;

// log4jsの初期化が間に合わないようなので少し待つ
setTimeout(function () {
    try {
        // 毎時0分0秒
        var cronTime = '0 0 * * * *';
        var job = new cron({
            cronTime: cronTime,
            onTick: botMainProcedure,
        });
        logger.info('cronTime : ' + cronTime);

        twit = new Twit(config);
        lastCheckedTime = new Date();

        job.start();
        logger.info('start');
    } catch (err) {
        logger.fatal(err);
        throw err;
    }
}, 1000);

function botMainProcedure () {
    'use strict';
    logger.debug('botMainProcedure');

    getNewComicCount()
        .then(tweetNewComicCount)
        .catch(function (err) {
            logger.error(err);
        });
}

function getNewComicCount () {
    'use strict';
    logger.debug('getNewComicCount');

    return new Promise(function (fulfill, reject) {
        var now = new Date();
        var query = db.Comic.count({
            registeredTime: { $gte: lastCheckedTime, $lt: now },
            isDeleted:      false,
        });
        query.exec(function (err, count) {
            if (err) {
                reject(err);
                return;
            }
            lastCheckedTime = now;
            fulfill(count);
        });
    });
}

/**
 * 起動あるいは前回のツイートから新しく投稿された作品数をツイートする
 */
function tweetNewComicCount (count) {
    'use strict';
    logger.debug('tweetNewComicCount : ' + count);

    return new Promise(function (fulfill, reject) {
        if (isNaN(count)) {
            reject(new Error('new comic count isNaN'));
            return;
        }

        if (count === 0) {
            fulfill();
            return;
        }

        var message = messagePrefix[Math.floor(Math.random() * messagePrefix.length)]
            + messageSuffix.replace('{count}', count)
                .replace('{time}', (lastCheckedTime.getHours() + 23) % 24)
                .replace('{url}', comicListUrl)
                .replace('{hashtag}', hashtag);
        twit.post('statuses/update', { status: message }, function (err) {
            if (err) {
                reject(err);
                return;
            }
            logger.info('tweet: ' + message);
            fulfill();
        });
    });
}
