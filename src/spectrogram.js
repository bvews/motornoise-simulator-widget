class Spectrogram {
    constructor(canvas) {
        this._canvas = canvas;
        this._canvasTemp = document.createElement('canvas');
        this._canvasTemp.width = canvas.width;
        this._canvasTemp.height = canvas.height;

        this._colors = [];

        this.generateColorMap([
            [0, 0, 0, 0.0],
            [0, 0, 255, 0.33],
            [0, 255, 255, 0.66],
            [255, 255, 255, 1.0],
        ]);

        this.generateColorMap([
            [0, 0, 0, 0.0],
            [255, 0, 0, 0.33],
            [255, 255, 0, 0.66],
            [255, 255, 255, 1.0],
        ]);

        this.generateColorMap([
            [192, 192, 192, 0.0],
            [76, 153, 255, 0.25],
            [229, 25, 229, 0.5],
            [255, 0, 0, 0.75],
            [255, 255, 255, 1.0]
        ]);

        this.generateColorMap([
            [0, 0, 0, 0.0],
            [0, 0, 80, 0.13],
            [110, 0, 128, 0.3],
            [240, 0, 0, 0.6],
            [254, 115, 0, 0.69],
            [255, 202, 0, 0.78],
            [255, 255, 140, 0.9],
            [255, 255, 255, 1.0]
        ]);

        // this.generateColorMap([
        //     [0, 0, 0, 0.0],
        //     [0, 0, 255, 0.2],
        //     [0, 255, 255, 0.4],
        //     [0, 255, 0, 0.6],
        //     [255, 255, 0, 0.8],
        //     [255, 0, 0, 1.0]
        // ]);

        this._frequencies = [];
    }

    generateColorMap(colorStops) {
        const dark = [0, 0, 255];
        const light = [0, 255, 255];

        for (let i = 0; i < 256; i++) {
            let rate = i / 255;
            //rate = rate * rate;
            let color = [0, 0, 0];

            if (colorStops.length < 2) {
                continue;
            } else if (rate < colorStops[0][3]) {
                color = colorStops[0].slice(0, 3);
            } else if (rate >= colorStops[colorStops.length - 1][3]) {
                color = colorStops[colorStops.length - 1].slice(0, 3);
            } else {
                for (let i = 0; i < colorStops.length - 1; i++) {
                    const current = colorStops[i];
                    const next = colorStops[i + 1];
                    if (rate >= current[3] && rate < next[3]) {
                        const coef = (rate - current[3]) / (next[3] - current[3]);
                        color[0] = current[0] * (1 - coef) + next[0] * coef;
                        color[1] = current[1] * (1 - coef) + next[1] * coef;
                        color[2] = current[2] * (1 - coef) + next[2] * coef;
                        break;
                    }
                }
            }

            // if (rate < 0.33) {
            //     const coef = (rate - 0) / (0.33 - 0);
            //     color[0] = 0 + dark[0] * coef;
            //     color[1] = 0 + dark[1] * coef;
            //     color[2] = 0 + dark[2] * coef;
            // } else if (rate < 0.66) {
            //     const coef = (rate - 0.33) / (0.66 - 0.33);
            //     color[0] = dark[0] * (1 - coef) + light[0] * coef;
            //     color[1] = dark[1] * (1 - coef) + light[1] * coef;
            //     color[2] = dark[2] * (1 - coef) + light[2] * coef;
            // } else {
            //     const coef = (rate - 0.66) / (1 - 0.66);
            //     color[0] = light[0] * (1 - coef) + 255 * coef;
            //     color[1] = light[1] * (1 - coef) + 255 * coef;
            //     color[2] = light[2] * (1 - coef) + 255 * coef;
            // }

            this._colors[i] = color.map(value => Math.round(value));
        }
    }

    setFrequencyListText(text) {
        this._frequencies = text.split(/[\n, ]/)
            .map(frequency => parseFloat(frequency))
            .filter(frequency => !isNaN(frequency));

        this._drawFrequencyMarkers();
    }

    update() {
        if (!this._analyserNode) {
            return;
        }

        const fftData = new Uint8Array(this._analyserNode.frequencyBinCount);
        this._analyserNode.getByteFrequencyData(fftData);

        let context;

        context = this._canvasTemp.getContext('2d');
        context.drawImage(this._canvasTemp, -1, 0);

        const imageData = context.createImageData(1, this._canvasTemp.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const pos = Math.floor((data.length - i) / 4) - 1;
            let color = [0, 0, 0];
            if (pos >= 0 && pos < fftData.length) {
                color = this._colors[fftData[pos]];
            }

            data[i + 0] = color[0];
            data[i + 1] = color[1];
            data[i + 2] = color[2];
            data[i + 3] = 255;
        }

        context.putImageData(imageData, this._canvas.width - 1, 0);

        this._drawFrequencyMarkers();
    }

    _drawFrequencyMarkers() {
        if(!this._analyserNode) {
            return;
        }
        
        context = this._canvas.getContext('2d');
        context.drawImage(this._canvasTemp, 0, 0);

        context.save();

        context.translate(0, 0.5);
        context.globalCompositeOperation = 'difference';
        context.strokeStyle = 'white';
        //context.setLineDash([1, 1]);

        context.font = '14px Arial';
        context.textBaseline = 'bottom';
        context.textAlign = 'left';
        context.fillStyle = 'white';

        context.beginPath();

        const fftSize = this._analyserNode.fftSize;
        const sampleRate = this._analyserNode.context.sampleRate;
        const pixelPerFreq = fftSize / sampleRate;
        const width = this._canvas.width;
        const height = this._canvas.height;
        this.pixelPerFreq = pixelPerFreq;

        this._frequencies.forEach(frequency => {
            const y = height - 1 - Math.floor(frequency * pixelPerFreq);
            if (y >= 0) {
                context.moveTo(0, y);
                context.lineTo(width, y);

                context.fillText(frequency, 0, y);
            }
        });

        context.stroke();

        context.restore();
    }

    clear() {
        this._clear(this._canvasTemp);
        this._drawFrequencyMarkers();
    }

    _clear(canvas) {
        const context = canvas.getContext('2d');
        const colorStyleText = `rgb(${this._colors[0].join(',')})`;
        context.fillStyle = colorStyleText;
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    setAnalyser(analyserNode) {
        analyserNode.smoothingTimeConstant = 0;
        this._analyserNode = analyserNode;

        // this.setDecibelsRange(-110, -40);
        // this.setFftSize(8192);
    }

    setDecibelsRange(min, max) {
        if (this._analyserNode) {
            const oldMax = this._analyserNode.maxDecibels;
            const oldMin = this._analyserNode.minDecibels;

            try {
                this._analyserNode.maxDecibels = max;
                this._analyserNode.minDecibels = min;
            } catch (e) {
                this._analyserNode.maxDecibels = oldMax;
                this._analyserNode.minDecibels = oldMin;
            }
        }
    }

    setFftSize(fftSize, isAdjust) {
        if (this._analyserNode) {
            const analyserNode = this._analyserNode;

            if (isAdjust) {
                const sampleRate = analyserNode.context.sampleRate;
                if (sampleRate > 96000) {
                    fftSize *= 4;
                } else if (sampleRate > 48000) {
                    fftSize *= 2;
                }
            }

            try {
                analyserNode.fftSize = fftSize;
                this._drawFrequencyMarkers();
            } catch (e) {
            }
        }
    }
}