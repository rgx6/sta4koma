(function () {
    'use strict';

    $(document).ready(function () {
        'use strict';

        var readLog = new ReadLog();

        location.href.match(/view\/(\d+)/);
        var fileName = RegExp.$1;
        readLog.read(fileName);
    });
})();
