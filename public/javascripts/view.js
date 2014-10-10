(function () {
    'use strict';

    $(document).ready(function () {
        'use strict';

        var readLog = new ReadLog();

        location.href.match(/view\/(\d+)/);
        var fileName = RegExp.$1;

        var userId = localStorage.UserID;
        if (!userId) {
            userId = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            localStorage.UserID = userId;
        }

        var goodCount = 0;

        readLog.read(fileName);
        getGoodCount();

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
    });
})();
