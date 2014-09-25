(function () {
    $(document).ready(function () {
        'use strict';

        var path = location.pathname;
        if (path.match(/^\/(view|list)\b/)) {
            $('#navbar-list').addClass('active');
        } else if (path.match(/^\/draw\b/)) {
            $('#navbar-draw').addClass('active');
        }
    });
})();
