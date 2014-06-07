(function () {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var ComicSchema = new Schema({
        author:         { type: String,  require: true },
        fileName:       { type: String,  require: true, index: true },
        registeredTime: { type: Date,    require: true },
        updatedTime:    { type: Date,    require: true },
        isDeleted:      { type: Boolean, require: true },
    });
    mongoose.model('Comic', ComicSchema);

    mongoose.connect('mongodb://localhost/sta4koma');

    exports.Comic = mongoose.model('Comic');
})();
