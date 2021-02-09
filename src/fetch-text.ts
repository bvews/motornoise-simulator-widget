function fetchText(url: string, onload: (text?: string) => void): void {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                onload(xhr.responseText);
            }
        }
    }, false);
    xhr.addEventListener('error', event => {
        onload(undefined);
    }, false);

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.send(null);
}