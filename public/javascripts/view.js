(function () {
    'use strict';

    $(document).ready(function () {
        'use strict';

        location.href.match(/view\/(\d+)/);
        var fileName = RegExp.$1;

        var author = getAuthorFromQuery();

        var userId = localStorage.UserID;
        if (!userId) {
            userId = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            localStorage.UserID = userId;
        }

        var goodCount = 0;
        getGoodCount();

        var readLog = new ReadLog();
        readLog.read(fileName);

        var noNext = false;
        var noPrev = false;

        $('#previous').on('click', function (e) {
            'use strict';
            // console.log('#previous click');

            if (!noPrev) moveTo('prev');
        });

        $('#next').on('click', function (e) {
            'use strict';
            // console.log('#next click');

            if (!noNext) moveTo('next');
        });

        $('#good').on('click', function () {
            'use strict';
            // console.log('#good click');

            $.ajax({
                type: 'POST',
                url: '/api/good',
                data: { fileName: fileName, userId: userId },
                cache: false,
                dataType: 'json',
                success: function (data, dataType)  {
                    if (data.updated) {
                        goodCount += 1;
                        $('#goodCount').text(goodCount);
                    }
                    $('#good').attr('disabled', 'disabled');
                },
                error: function (req, status, error) {
                    console.error(req.responseJSON);
                }
            });

        });

        function getAuthorFromQuery () {
            'use strict';
            // console.log('getAuthorFromQuery');

            if (location.search.match(/author=(.+)/)) {
                return RegExp.$1;
            } else {
                return null;
            }
        }

        function getGoodCount () {
            'use strict';
            // console.log('getGoodCount');

            $.ajax({
                type: 'GET',
                url: '/api/good/' + fileName,
                cache: false,
                dataType: 'json',
                success: function (data, dataType)  {
                    goodCount = data.count;
                    $('#goodCount').text(goodCount);
                },
                error: function (req, status, error) {
                    console.error(req.responseJSON);
                }
            });
        }

        function moveTo (direction) {
            'use strict';
            // console.log('moveTo ' + direction);

            $.ajax({
                type: 'GET',
                url: '/api/view/' + direction + '/' + fileName + '/' + (author ? author : ''),
                cache: false,
                dataType: 'json',
                success: function (data, dataType)  {
                    if (data.fileName) {
                        location = '/view/' + data.fileName + (author ? '?author=' + author : '');
                    } else {
                        if (direction === 'next') {
                            noNext = true;
                            $('#next').hide();
                        } else if (direction === 'prev') {
                            noPrev = true;
                            $('#previous').hide();
                        }
                    }
                },
                error: function (req, status, error) {
                    console.error(req.responseJSON);
                }
            });
        };
    });
})();
