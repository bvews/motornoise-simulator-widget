(function () {
    // Smooth scroll powerd by JQuery.
    if (typeof $ !== 'undefined') {
        $(function () {
            // On click anchors which starts with "#".
            $('a[href^=#]').click(function () {
                // Scroll speed
                var speed = 400; // Millisec.
                // Get anchor value
                var href = $(this).attr('href');
                // Get destination
                var target = $(href == '#' || href == '' ? 'html' : href);
                // Get destination by value
                var position = target.offset().top;
                // Smooth scroll
                $($.browser.safari ? 'body' : 'html').animate({ scrollTop: position }, speed, 'swing');
                return false;
            });
        });
    }

    // Highlight JS Initialize.
    if (typeof hljs !== 'undefined') {
        hljs.initHighlightingOnLoad();
    }

    // MathJax Initialize.
    if (typeof MathJax !== 'undefined') {
        MathJax.Hub.Config({
            displayAlign: 'left',
            displayIndent: '2em'
        });
    }
}());