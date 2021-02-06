import { MotornoiseSimulator } from './motornoise-simulator.js';
import { AudioContextHandler } from './audio-context-handler.js';
import { generateArcPath } from './svg-path-functions.js';

/**
 *
 * @callback createHtmlElement
 * @returns {HTMLElement}
 */
/**
 * 
 * @param {createHtmlElement} createHtmlElement 
 */
export class MotornoiseSimulatorWidgetInitializer {
    constructor(createHtmlElement) {
        /** @type {HTMLElement} */
        this.widgets = null;
        /** @type {AudioContextHandler} */
        this.audioContextHandler = null;

        this.audioContextHandler = new AudioContextHandler();
        const handler = this.audioContextHandler;
        const enabledWebAudioApi = handler.enabledWebAudioApi;

        const widget = createHtmlElement();

        /** @type {NodeList} */
        const widgetElements = document.querySelectorAll('.motornoise-simulator-widget');
        /** @type {Object.<string, MotornoiseSimulator>} */
        const motornoiseSimulators = {};

        // window.addEventListener('beforeunload', function (event) {
        //     for (var ms in motornoiseSimulators) {
        //         if (motornoiseSimulators.hasOwnProperty(ms)) {
        //             motornoiseSimulators[ms].close();
        //         }
        //     }
        // }, false);

        // Create Motornoise Simulator Widgets.
        for (let i = 0; i < widgetElements.length; i++) {
            const motornoiseSimulatorDiv = widgetElements[i];
            const dataset = motornoiseSimulatorDiv.dataset;
            const url = motornoiseSimulatorDiv.dataset.url;
            const id = widgetElements[i].id;
            const maxSpeed = motornoiseSimulatorDiv.dataset.maxSpeed;
            const lang = (navigator.browserLanguage || navigator.language || navigator.userLanguage).substr(0, 2);

            if (lang) {
                motornoiseSimulatorDiv.lang = lang;
            }

            // Remove nodes of the widget element.
            while (motornoiseSimulatorDiv.firstChild) {
                motornoiseSimulatorDiv.removeChild(motornoiseSimulatorDiv.firstChild);
            }

            const content = document.importNode(widget, true);

            // If the browser don't support Web Audio API, show "Unsupported" message.
            if (!enabledWebAudioApi || enabledWebAudioApi === false) {
                //Array.prototype.forEach.call(content.children, function (c) { c.style.display = 'none'; });
                content.querySelector('.unsupported').style.display = '';
                motornoiseSimulatorDiv.appendChild(content);
                continue;
            }

            const base = content.querySelector('.base');
            const message = content.querySelector('.message');
            const launcher = content.querySelector('.launcher');
            const gauge = content.querySelector('.gauge');
            const controls = content.querySelector('.controls');
            const launchButton = content.querySelector('.launch-button');

            const title = content.querySelector('.title');
            const info = content.querySelector('.info');
            const separator = content.querySelector('.separator');
            const operation = content.querySelector('.operation');
            const system = content.querySelector('.system');
            const spectrogram = content.querySelector('.spectrogram');
            const canvas = spectrogram.querySelector('canvas');

            launcher.style.display = '';

            controls.style.display = 'none';
            //gauge.style.display = 'none';
            title.style.display = 'none';

            const sanitize = str => str.replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, '\'')
                .replace(/&amp;/g, '&');
            const setTitle = (element, title, lang) => {
                if (!element || !title) {
                    return;
                }
                const titles = title.split(';');
                for (let i = 0; i < titles.length; i++) {
                    const t = titles[i].split(':');
                    if (t[1] && lang === t[0]) {
                        element.innerText = sanitize(t[1]);
                        return;
                    }
                }
                element.innerText = titles[0];
            };
            setTitle(title, motornoiseSimulatorDiv.dataset.title, lang);

            // Check touch event implement on browsers.
            // https://www.yoheim.net/blog.php?q=20140206
            const hasTapEvent = () => {
                const iframe = document.createElement('iframe');
                document.body.appendChild(iframe);
                const result = ('ontouchstart' in iframe.contentWindow);
                iframe.remove();
                return result;
            }

            // Wake up AudioContext by user action.
            // https://qiita.com/zprodev/items/7fcd8335d7e8e613a01f
            /**
             * 
             * @param {AudioContext} audioContext 
             * @param {HTMLElement} element 
             */
            const wakeupAudioContext = (audioContext, element) => {
                // For Safari
                if (true) {
                    const initAudioContextSafari = () => {
                        element.removeEventListener('touchstart', initAudioContextSafari);
                        // Wake up AudioContext
                        const emptySource = audioContext.createBufferSource();
                        emptySource.start();
                        emptySource.stop();
                    };
                    element.addEventListener('touchstart', initAudioContextSafari);
                }

                // For Google Chrome
                const eventName = typeof document.ontouchend !== 'undefined' ? 'touchend' : 'mouseup';
                const initAudioContextChrome = () => {
                    element.removeEventListener(eventName, initAudioContextChrome);
                    // Wake up AudioContext
                    audioContext.resume();
                };
                element.addEventListener(eventName, initAudioContextChrome);
            };

            const gaugeBaseUrl = dataset.gaugeBase ? `${url}/${dataset.gaugeBase}` : undefined;
            const gaugeNeedleUrl = dataset.gaugeNeedle ? `${url}/${dataset.gaugeNeedle}` : undefined;
            const gaugeCoverUrl = dataset.gaugeCover ? `${url}/${dataset.gaugeCover}` : undefined;


            const scaleProfile = dataset.scaleProfile || '0,-120;120,120';
            const min = scaleProfile.split(';')[0];
            const max = scaleProfile.split(';')[1];

            const minValue = parseFloat(min.split(',')[0]);
            const minAngle = parseFloat(min.split(',')[1]);
            const maxValue = parseFloat(max.split(',')[0]);
            const maxAngle = parseFloat(max.split(',')[1]);

            const setImgSrc = (element, query, value) => {
                const elt = element.querySelector(query);
                if (elt && value) {
                    elt.src = value;
                    elt.style.visibility = 'visible';
                }
            };

            setImgSrc(content, '.gauge-base', gaugeBaseUrl);
            setImgSrc(content, '.gauge-needle', gaugeNeedleUrl);
            setImgSrc(content, '.gauge-cover', gaugeCoverUrl);

            const gElt = content.querySelector('.g-needle-rotate');
            const imgGaugeNeedle = content.querySelector('.gauge-needle');
            const pathElt = content.querySelector('.path-digital-gauge');
            const digitsElt = content.querySelector('.digits');
            const isScaleDigital = dataset.isScaleDigital;

            if (isScaleDigital === 'false') {
                pathElt.setAttribute('stroke', 'none');
                pathElt.setAttribute('fill', 'none');
                digitsElt.parentNode.removeChild(digitsElt);
            } else {
                digitsElt.style.display = 'block';
            }

            let intSpeed = NaN;
            let prevNums = [0, NaN, NaN];

            const width = 42;
            pathElt.setAttribute('stroke-width', width);
            const updateGauge = speed => {
                // const minValue = 0;
                // const maxValue = 140;
                // const minAngle = -136;
                // const maxAngle = 144;
                const radius = 225;
                const step = 2;

                let angle = speed * (maxAngle - minAngle) / (maxValue - minValue) + minAngle;
                let angleD = (speed - step / 2) * (maxAngle - minAngle) / (maxValue - minValue) + minAngle;

                const angleStep = (maxAngle - minAngle) / (maxValue - minValue) * step;
                const digitalAngle = minAngle + parseInt((angleD - minAngle) / angleStep) * angleStep - angleStep / 2;

                if (isScaleDigital === 'true') {
                    if (intSpeed !== parseInt(speed)) {
                        intSpeed = parseInt(speed);

                        // Update scale.
                        if (intSpeed === 0 || intSpeed % 2 === 1) {
                            pathElt.setAttribute('d', generateArcPath(radius, digitalAngle, maxAngle));
                        }

                        // Update digits.
                        const intSpeedAbs = Math.abs(intSpeed);
                        let n0 = parseInt(intSpeedAbs % 10);
                        let n1 = parseInt(parseInt(intSpeedAbs / 10) % 10);
                        let n2 = parseInt(parseInt(intSpeedAbs / 100) % 10);

                        if (intSpeedAbs < 100) {
                            n2 = NaN;
                        }
                        if (intSpeedAbs < 10) {
                            n1 = NaN;
                        }

                        const nums = [n0, n1, n2];
                        for (let i = 0; i < 3; i++) {
                            if (!isNaN(prevNums[i]) || !isNaN(nums[i])) {
                                if (prevNums[i] !== nums[i]) {
                                    if (!isNaN(prevNums[i])) {
                                        //digitsElt.querySelector('.d' + i).querySelector('.n' + prevNums[i]).style.visibility = 'hidden';
                                        digitsElt.querySelector(`.d${i}`).querySelector(`.n${prevNums[i]}`).style.opacity = 0;
                                    } else {
                                    }
                                    if (!isNaN(nums[i])) {
                                        //digitsElt.querySelector('.d' + i).querySelector('.n' + nums[i]).style.visibility = 'visible';
                                        digitsElt.querySelector(`.d${i}`).querySelector(`.n${nums[i]}`).style.opacity = 1;
                                    } else {
                                    }

                                    prevNums[i] = nums[i];
                                }
                            }
                        }
                    }
                } else {
                    imgGaugeNeedle.style.transform = `rotate(${angle}deg)`;
                    //imgGaugeNeedle.style.transform = 'rotate3d(0, 0, 1, ' + angle + 'deg)';
                }
            };
            // Initialize gauge.
            updateGauge(0);

            const motornoiseSimulator = new MotornoiseSimulator(new AudioContext(), `${url}/`, maxSpeed, canvas);
            motornoiseSimulators[id] = motornoiseSimulator;

            launchButton.onclick = () => {
                motornoiseSimulators[id].load(() => {
                    message.style.display = 'none';
                    controls.style.display = 'block';
                    gauge.style.display = 'block';
                    title.style.display = 'block';

                    motornoiseSimulator.startMainLoop();
                }, (loadCount, maxCount) => {
                    message.innerText = `Loading... (${loadCount} / ${maxCount})`;
                });

                message.innerText = 'Loading...';
                message.style.display = 'block';
                launcher.style.display = 'none';
            };
            // if (lang === 'ja') {
            //     launchButton.innerText = 'モータ音シミュレータを起動する';
            // } else {
            //     launchButton.innerText = 'Launch Motornoise Simulator';
            // }
            wakeupAudioContext(motornoiseSimulator.audioContext, launchButton);

            const notchSpan = content.querySelector('.notch-span');
            const speedSpan = content.querySelector('.speed-span');

            const setNotchText = () => {
                const notch = motornoiseSimulator.notch;
                let notchString = '';
                if (notch > 0) {
                    notchString = `P${notch}`;
                } else if (notch < 0) {
                    notchString = `B${-notch}`;
                } else {
                    notchString = 'N';
                }
                notchSpan.innerText = `Notch: ${notchString}`;
            };

            content.querySelector('.max-power-button').onclick = () => {
                motornoiseSimulator.setNotchFullPower();
                setNotchText();
            };

            content.querySelector('.set-power-button').onclick = () => {
                motornoiseSimulator.setNotchIncrement();
                setNotchText();
            };

            content.querySelector('.set-neutral-button').onclick = () => {
                motornoiseSimulator.setNotchNeutral();
                setNotchText();
            };

            content.querySelector('.set-brake-button').onclick = () => {
                motornoiseSimulator.setNotchDecrement();
                setNotchText();
            };

            content.querySelector('.max-brake-button').onclick = () => {
                motornoiseSimulator.setNotchFullBrake();
                setNotchText();
            };

            const muteButton = content.querySelector('.mute-button');
            muteButton.onclick = () => {
                motornoiseSimulator.toggleMute(() => { muteButton.innerText = 'Unmute'; },
                    () => { muteButton.innerText = 'Mute'; });
            };

            const spectrogramButton = content.querySelector('.spectrogram-button');
            spectrogramButton.onclick = () => {
                motornoiseSimulator.toggleSpectrogram(() => {
                    spectrogramButton.innerText = 'Spectrogram ON';
                    spectrogram.style.display = 'none';
                }, () => {
                    spectrogramButton.innerText = 'Spectrogram OFF';
                    spectrogram.style.display = 'block';
                });
            };

            content.querySelector('.stop-button').onclick = () => {
                motornoiseSimulator.setNotchNeutral();
                motornoiseSimulator.speed = 0;
                motornoiseSimulator.clearSpectrogram();
                setNotchText();
                updateGauge(0);
            };

            motornoiseSimulatorDiv.appendChild(content);

            motornoiseSimulator.ontick = speed => {
                if (true) {
                    speedSpan.textContent = `Speed: ${speed.toFixed(1)}km/h`;
                    //speedSpan.innerText = 'Speed: ' + speed.toFixed(1) + 'km/h';
                }
                updateGauge(speed);
            };

            document.addEventListener('visibilitychange', event => {
                motornoiseSimulator.handleVisibilitychange(event);
            });
        }
    }
}