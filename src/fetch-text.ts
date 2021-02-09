function fetchText(url, onload) {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                onload(xhr.responseText);
            }
        }
    }, false);
    xhr.addEventListener('error', event => {
        onload(null);
    }, false);

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.send(null);
}