(function () {
    'use strict';

    var mongoose = require('mongoose');
    var config = require('../db_configuration.js');

    var Schema = mongoose.Schema;

    var ComicSchema = new Schema({
        author:         { type: String,  require: true },
        fileName:       { type: String,  require: true, index: true },
        registeredTime: { type: Date,    require: true },
        updatedTime:    { type: Date,    require: true },
        isDeleted:      { type: Boolean, require: true },
    });
    mongoose.model('Comic', ComicSchema);

    var GoodSchema = new Schema({
        fileName:       { type: String,  require: true, index: true },
        userId:         { type: String,  require: true },
        registeredTime: { type: Date,    require: true },
    });
    mongoose.model('Good', GoodSchema);

    mongoose.connect(config.connectionString);

    exports.Comic = mongoose.model('Comic');
    exports.Good = mongoose.model('Good');
})();
