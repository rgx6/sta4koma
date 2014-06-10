var Twit    = require('twit');
var Promise = require('es6-promise').Promise;
var cron    = require('cron').CronJob;
var logger  = require('log4js').getLogger('appLog');
var db      = require('./db.js');
var config  = require('../twitter_configuration.js');

var messagebase = 'すたちゅーさんの4コマまんがが{count}本投稿されたよ！({hour}時台)\n{url}\n{hashtag}';
// hack : domainを設定ファイルに
var comicListUrl = 'http://sta4koma.rgx6.com/list/1';
var hashtag = '#すた4コマ';

// 毎時0分
var cronTime = '* * */1 * * *';
var job = new cron({
    cronTime: cronTime,
    onTick: botMainProcedure,
});

// hack : botなしでも動くようにしたほうがいいか？
var twit = new Twit(config);

var lastCheckedTime = new Date();

exports.start = function () {
    'use strict';
    logger.debug('twitter_tweet_bot start');

    job.start();
};

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
                reject(new Error(err));
                return;
            }
            lastCheckedTime = now;
            fulfill(count);
        });
    });
}

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
        var message = messagebase.replace('{count}', count)
                .replace('{hour}', lastCheckedTime.getHours())
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
