(function () {
    'use strict';

    $(document).ready(function () {
        'use strict';

        var page = getPageFromUrl();
        if (!page) location = '/list';

        getList(page);

        window.onpopstate = function (event) {
            'use strict';
            // console.log('onpopstate');

            page = getPageFromUrl();
            getList(page);
        };

        function getPageFromUrl () {
            'use strict';
            // console.log('getPageFromUrl');

            if (location.pathname.match(/^\/list\/?$/)) {
                return 1;
            } else if (location.pathname.match(/^\/list\/([1-9][0-9]*)$/)) {
                return RegExp.$1;
            } else {
                return null;
            }
        }

        function getList (page) {
            'use strict';
            // console.log('getList');

            $.ajax({
                type: 'GET',
                url: '/api/list/' + page,
                cache: false,
                dataType: 'json',
                success: function (data, dataType)  {
                    showList(data.comics);
                    showPager(data.items, data.itemsPerPage);
                },
                error: function (req, status, error) {
                    console.error(req.responseJSON);
                    $('#list').empty();
                    $('#list').append('エラー');
                }
            });
        }

        function showList (comics) {
            'use strict';
            // console.log('showList');

            $('#list').empty();

            comics.forEach(function (comic) {
                $('#list').append(
                    '<a class="thumbnail pull-left" href="/view/' + comic.fileName + '" target="_blank">'
                        + '<img src="/c/thumb/' + comic.fileName + '.thumb.png"'
                        + 'title="' + new Date(Number(comic.fileName)).toString() + '"'
                        + 'alt="ファイルがないよ(´・ω・｀)" />'
                        + '<div class="caption text-center">'
                        + '描いた人：&nbsp;' + escapeHTML(comic.author)
                        + '</div>');
            });
        }

        function showPager (items, itemsPerPage) {
            'use strict';
            // console.log('showPager');

            $('#pagination').pagination({
                items: items,
                itemsOnPage: itemsPerPage,
                currentPage: page,
                prevText: '前',
                nextText: '次',
                hrefTextPrefix: '',
                onPageClick: function (pageNumber, event) {
                    page = pageNumber;
                    getList(page);
                    history.pushState(null, null, '/list/' + page);
                    return false;
                },
            });
        }

        function escapeHTML (val) {
            return $('<div />').text(val).html();
        }
    });
})();
