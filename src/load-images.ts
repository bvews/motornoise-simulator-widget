function loadImages(imageEntries: any[], onload: (imageEntries?: any[]) => void, onupdate: (loadCount: number, imageCount: number) => void) {
    let loadCount = 0;
    const imageCount = imageEntries.length;
    onupdate(loadCount, imageCount);

    imageEntries.forEach(entry => {
        const image = new Image();
        image.onload = () => {
            entry.image = image;

            loadCount++;
            if (onupdate) {
                onupdate(loadCount, imageCount);
            }
            if (loadCount >= imageCount) {
                onload(imageEntries);
            }
        };
        image.onerror = () => {
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