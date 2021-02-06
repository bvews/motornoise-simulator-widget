function loadImages(imageEntries, onload, onupdate) {
    let loadCount = 0;
    const imageCount = imageEntries.length;
    onupdate(loadCount, imageCount);

    imageEntries.forEach(function (entry) {
        const image = new Image();
        image.onload = function () {
            entry.image = image;

            loadCount++;
            if (onupdate) {
                onupdate(loadCount, imageCount);
            }
            if (loadCount >= imageCount) {
                onload(imageEntries);
            }
        };
        image.onerror = function () {
            entry.image = null;

            loadCount++;
            if (onupdate) {
                onupdate(loadCount, imageCount);
            }
            if (loadCount >= imageCount) {
                onload(imageEntries);
            }
        }
        image.src = entry.url;
    });
}