var ReadLog = (function () {
    'use strict';

    function ReadLog() {
        'use strict';
        // console.log('ReadLog');

        this.comics = localStorage.ReadLog ? JSON.parse(localStorage.ReadLog) : {};
    }

    ReadLog.prototype.save = function () {
        'use strict';
        // console.log('ReadLog.save');

        localStorage.ReadLog = JSON.stringify(this.comics);
    };

    ReadLog.prototype.isRead = function (fileName) {
        'use strict';
        // console.log('ReadLog.isRead');

        if (this.comics[fileName]) {
            return true;
        } else {
            return false;
        }
    };

    ReadLog.prototype.read = function (fileName) {
        'use strict';
        // console.log('ReadLog.read');

        if (!this.comics[fileName]) {
            this.comics[fileName] = true;
            this.save();
        }
    };

    return ReadLog;
})();
