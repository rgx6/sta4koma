(function () {
    $(document).ready(function () {
        'use strict';

        var path = location.pathname;
        if (path.match(/^\/view\//) || path.match(/^\/list\//)) {
            $('#navbar-list').addClass('active');
        } else if (path.match(/^\/draw\//) || path === '/') {
            $('#navbar-draw').addClass('active');
        }
    });
})();
