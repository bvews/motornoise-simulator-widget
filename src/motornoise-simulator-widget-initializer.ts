import { MotornoiseSimulator } from './motornoise-simulator.js';
import { AudioContextHandler } from './audio-context-handler.js';
import { generateArcPath } from './svg-path-functions.js';
import { BrowserCompatible } from './browser-compatible.js';

/**
 *
 * @callback createHtmlElement
 * @returns 
 */
/**
 * 
 * @param createHtmlElement 
 */
export class MotornoiseSimulatorWidgetInitializer {
    private widgets?: HTMLElement;
    private audioContextHandler = new AudioContextHandler();

    constructor(createHtmlElement: () => HTMLElement | DocumentFragment) {
        const handler = this.audioContextHandler;
        const enabledWebAudioApi = handler.enabledWebAudioApi;

        const widget = createHtmlElement();

        const widgetElements = document.querySelectorAll<HTMLElement>('.motornoise-simulator-widget');
        const motornoiseSimulators: { [id: string]: MotornoiseSimulator } = {};

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
            if (!(motornoiseSimulatorDiv instanceof HTMLElement)) {
                continue;
            }
            const dataset = motornoiseSimulatorDiv.dataset;
            const url = motornoiseSimulatorDiv.dataset.url;
            const id = widgetElements[i].id;
            let maxSpeed = Number(motornoiseSimulatorDiv.dataset.maxSpeed);
            maxSpeed = isNaN(maxSpeed) ? 100 : maxSpeed;
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
            if (!enabledWebAudioApi) {
                if (content) {
                    //Array.prototype.forEach.call(content.children, function (c) { c.style.display = 'none'; });
                    const el = content.querySelector<HTMLElement>('.unsupported');
                    if (el instanceof HTMLElement) {
                        el.style.display = '';
                    }
                    motornoiseSimulatorDiv.appendChild(content);
                }
                continue;
            }

            const base = content.querySelector<HTMLElement>('.base');
            const message = content.querySelector<HTMLElement>('.message');
            const launcher = content.querySelector<HTMLElement>('.launcher');
            const gauge = content.querySelector<HTMLElement>('.gauge');
            const controls = content.querySelector<HTMLElement>('.controls');
            const launchButton = content.querySelector<HTMLElement>('.launch-button');

            const title = content.querySelector<HTMLElement>('.title');
            const info = content.querySelector<HTMLElement>('.info');
            const separator = content.querySelector<HTMLElement>('.separator');
            const operation = content.querySelector<HTMLElement>('.operation');
            const system = content.querySelector<HTMLElement>('.system');
            const spectrogram = content.querySelector<HTMLElement>('.spectrogram');
            const canvas = spectrogram?.querySelector('canvas');

            if (launcher && launcher instanceof HTMLElement) {
                launcher.style.display = '';
            }
            if (controls && controls instanceof HTMLElement) {
                controls.style.display = 'none';
            }
            //gauge.style.display = 'none';
            if (title && title instanceof HTMLElement) {
                title.style.display = 'none';
            }

            const sanitize = (str: string) => str.replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, '\'')
                .replace(/&amp;/g, '&');
            const setTitle = (element: HTMLElement | null, title: string | undefined, lang: string): void => {
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
            if (title instanceof HTMLElement) {
                setTitle(title, motornoiseSimulatorDiv.dataset.title, lang);
            }

            // Check touch event implement on browsers.
            // https://www.yoheim.net/blog.php?q=20140206
            const hasTapEvent = (): boolean => {
                const iframe = document.createElement('iframe');
                document.body.appendChild(iframe);
                const result = !!(iframe.contentWindow && 'ontouchstart' in iframe.contentWindow);
                iframe.remove();
                return result;
            }

            // Wake up AudioContext by user action.
            // https://qiita.com/zprodev/items/7fcd8335d7e8e613a01f
            /**
             * 
             * @param audioContext 
             * @param element 
             */
            const wakeupAudioContext = (audioContext: AudioContext, element: HTMLElement | null | undefined): void => {
                const browserCompatible = new BrowserCompatible();
                // For Safari
                if (browserCompatible.browser === 'safari') {
                    const initAudioContextSafari = () => {
                        element?.removeEventListener('touchstart', initAudioContextSafari);
                        // Wake up AudioContext
                        const emptySource = audioContext.createBufferSource();
                        emptySource.start();
                        emptySource.stop();
                    };
                    element?.addEventListener('touchstart', initAudioContextSafari);
                }

                // For Google Chrome
                const eventName = typeof document.ontouchend !== 'undefined' ? 'touchend' : 'mouseup';
                const initAudioContextChrome = () => {
                    element?.removeEventListener(eventName, initAudioContextChrome);
                    // Wake up AudioContext
                    audioContext.resume();
                };
                element?.addEventListener(eventName, initAudioContextChrome);
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

            const setImgSrc = (element: HTMLElement | DocumentFragment, query: string, value: string | undefined): void => {
                const elt = element.querySelector<HTMLElement>(query);
                if (elt && elt instanceof HTMLImageElement && value) {
                    elt.src = value;
                    elt.style.visibility = 'visible';
                }
            };

            setImgSrc(content, '.gauge-base', gaugeBaseUrl);
            setImgSrc(content, '.gauge-needle', gaugeNeedleUrl);
            setImgSrc(content, '.gauge-cover', gaugeCoverUrl);

            const gElt = content.querySelector<HTMLElement>('.g-needle-rotate');
            const imgGaugeNeedle = content.querySelector<HTMLElement>('.gauge-needle');
            const pathElt = content.querySelector<HTMLElement>('.path-digital-gauge');
            const digitsElt = content.querySelector<HTMLElement>('.digits');
            const isScaleDigital = dataset.isScaleDigital;

            if (isScaleDigital === 'false') {
                pathElt?.setAttribute('stroke', 'none');
                pathElt?.setAttribute('fill', 'none');
                digitsElt?.parentNode?.removeChild(digitsElt);
            } else {
                digitsElt?.style?.setProperty('display', 'block');
            }

            let intSpeed = NaN;
            const prevNums = [0, NaN, NaN];

            const width = 42;
            pathElt?.setAttribute('stroke-width', width.toString());
            const updateGauge = (speed: number): void => {
                // const minValue = 0;
                // const maxValue = 140;
                // const minAngle = -136;
                // const maxAngle = 144;
                const radius = 225;
                const step = 2;

                const angle = speed * (maxAngle - minAngle) / (maxValue - minValue) + minAngle;
                const angleD = (speed - step / 2) * (maxAngle - minAngle) / (maxValue - minValue) + minAngle;

                const angleStep = (maxAngle - minAngle) / (maxValue - minValue) * step;
                const digitalAngle = minAngle + Math.floor((angleD - minAngle) / angleStep) * angleStep - angleStep / 2;

                if (isScaleDigital === 'true') {
                    if (intSpeed !== Math.floor(speed)) {
                        intSpeed = Math.floor(speed);

                        // Update scale.
                        if (intSpeed === 0 || intSpeed % 2 === 1) {
                            pathElt?.setAttribute('d', generateArcPath(radius, digitalAngle, maxAngle));
                        }

                        // Update digits.
                        const intSpeedAbs = Math.abs(intSpeed);
                        const n0 = Math.floor(intSpeedAbs % 10);
                        let n1 = Math.floor(Math.floor(intSpeedAbs / 10) % 10);
                        let n2 = Math.floor(Math.floor(intSpeedAbs / 100) % 10);

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
                                        //digitsElt.querySelector<HTMLElement>('.d' + i).querySelector<HTMLElement>('.n' + prevNums[i]).style.visibility = 'hidden';
                                        digitsElt?.querySelector<HTMLElement>(`.d${i}`)?.querySelector<HTMLElement>(`.n${prevNums[i]}`)?.style?.setProperty('opacity', '0');
                                    } else {
                                    }
                                    if (!isNaN(nums[i])) {
                                        //digitsElt.querySelector<HTMLElement>('.d' + i).querySelector<HTMLElement>('.n' + nums[i]).style.visibility = 'visible';
                                        digitsElt?.querySelector<HTMLElement>(`.d${i}`)?.querySelector<HTMLElement>(`.n${nums[i]}`)?.style?.setProperty('opacity', '1');
                                    } else {
                                    }

                                    prevNums[i] = nums[i];
                                }
                            }
                        }
                    }
                } else {
                    imgGaugeNeedle?.style?.setProperty('transform', `rotate(${angle}deg)`);
                    //imgGaugeNeedle.style.transform = 'rotate3d(0, 0, 1, ' + angle + 'deg)';
                }
            };
            // Initialize gauge.
            updateGauge(0);

            const motornoiseSimulator = new MotornoiseSimulator(new AudioContext(), `${url}/`, maxSpeed, canvas);
            motornoiseSimulators[id] = motornoiseSimulator;

            if (launchButton && launchButton instanceof HTMLElement) {
                launchButton.onclick = () => {
                    motornoiseSimulators[id].load(() => {
                        message?.style?.setProperty('display', 'none');
                        controls?.style?.setProperty('display', 'block');
                        gauge?.style?.setProperty('display', 'block');
                        title?.style?.setProperty('display', 'block');

                        motornoiseSimulator.startMainLoop();
                    }, (loadCount: number, maxCount: number) => {
                        if (message) {
                            message.innerText = `Loading... (${loadCount} / ${maxCount})`;
                        }
                    });

                    if (message) {
                        message.innerText = 'Loading...';
                    }
                    message?.style?.setProperty('display', 'block');
                    launcher?.style?.setProperty('display', 'none');
                };
            }
            // if (lang === 'ja') {
            //     launchButton.innerText = 'モータ音シミュレータを起動する';
            // } else {
            //     launchButton.innerText = 'Launch Motornoise Simulator';
            // }
            wakeupAudioContext(motornoiseSimulator.audioContext, launchButton);

            const notchSpan = content.querySelector<HTMLElement>('.notch-span');
            const speedSpan = content.querySelector<HTMLElement>('.speed-span');

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
                if (notchSpan) {
                    notchSpan.innerText = `Notch: ${notchString}`;
                }
            };

            content.querySelector<HTMLElement>('.max-power-button')?.addEventListener('click', () => {
                motornoiseSimulator.setNotchFullPower();
                setNotchText();
            });

            content.querySelector<HTMLElement>('.set-power-button')?.addEventListener('click', () => {
                motornoiseSimulator.setNotchIncrement();
                setNotchText();
            });

            content.querySelector<HTMLElement>('.set-neutral-button')?.addEventListener('click', () => {
                motornoiseSimulator.setNotchNeutral();
                setNotchText();
            });

            content.querySelector<HTMLElement>('.set-brake-button')?.addEventListener('click', () => {
                motornoiseSimulator.setNotchDecrement();
                setNotchText();
            });

            content.querySelector<HTMLElement>('.max-brake-button')?.addEventListener('click', () => {
                motornoiseSimulator.setNotchFullBrake();
                setNotchText();
            });

            const muteButton = content.querySelector<HTMLElement>('.mute-button');
            if (muteButton) {
                muteButton.onclick = () => {
                    motornoiseSimulator.toggleMute(() => { muteButton.innerText = 'Unmute'; },
                        () => { muteButton.innerText = 'Mute'; });
                };
            }

            const spectrogramButton = content.querySelector<HTMLElement>('.spectrogram-button');
            if (spectrogramButton) {
                spectrogramButton.onclick = () => {
                    motornoiseSimulator.toggleSpectrogram(() => {
                        spectrogramButton.innerText = 'Spectrogram ON';
                        spectrogram?.style?.setProperty('display', 'none');
                    }, () => {
                        spectrogramButton.innerText = 'Spectrogram OFF';
                        spectrogram?.style?.setProperty('display', 'none');
                    });
                };
            }

            content.querySelector<HTMLElement>('.stop-button')?.addEventListener('click', () => {
                motornoiseSimulator.setNotchNeutral();
                motornoiseSimulator.speed = 0;
                motornoiseSimulator.clearSpectrogram();
                setNotchText();
                updateGauge(0);
            });

            motornoiseSimulatorDiv.appendChild(content);

            motornoiseSimulator.ontick = (speed: number): void => {
                if (true && speedSpan) {
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