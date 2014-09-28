(function () {
    'use strict';

    $(document).ready(function () {
        'use strict';

        var page = getPageFromUrl();
        if (!page) location = '/list';

        var author = getAuthorFromQuery();

        getList(page, author);

        window.onpopstate = function (event) {
            'use strict';
            // console.log('onpopstate');

            page = getPageFromUrl();
            author = getAuthorFromQuery();
            getList(page, author);
        };

        $('#search').on('click', function () {
            'use strict';
            // console.log('#search click');

            var condition = $('#author').val().trim();
            author = encodeURIComponent(condition);
            page = 1;

            getList(page, author);
            history.pushState(null, null, '/list' + (author ? '?author=' + author : ''));
        });

        $('#author').on('keypress', function (event) {
            'use strict';
            // console.log('#auhtor keypress');

            if (event.keyCode === 13) {
                $('#search').trigger('click');
            }
        });

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

        function getAuthorFromQuery () {
            'use strict';
            // console.log('getAuthorFromQuery');

            if (location.search.match(/author=(.+)/)) {
                return RegExp.$1;
            } else {
                return null;
            }
        }

        function getList (page, author) {
            'use strict';
            // console.log('getList');

            $.ajax({
                type: 'GET',
                url: '/api/list/' + page + (author ? '/' + author : ''),
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

            var name = author ? decodeURIComponent(author) : '';
            name = name === '名無しさん' ? name : name + 'さん';
            $('#title').text(name ? name + 'の作品一覧' : '作品一覧');
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
                hrefTextSuffix: author ? '?author=' + author : '',
                onPageClick: function (pageNumber, event) {
                    page = pageNumber;
                    author = getAuthorFromQuery();
                    getList(page, author);
                    history.pushState(null, null, '/list/' + page + (author ? '?author=' + author : ''));
                    return false;
                },
            });
        }

        function escapeHTML (val) {
            return $('<div />').text(val).html();
        }
    });
})();
