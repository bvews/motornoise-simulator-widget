function fetchText(url, onload) {
    'use strict';
    const xhr = new XMLHttpRequest();
    
    xhr.addEventListener('load', function (event) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                onload(xhr.responseText);
            }
        }
    }, false);
    xhr.addEventListener('error', function (event) {
        onload(null);
    }, false);

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.send(null);
}