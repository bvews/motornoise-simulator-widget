import { MotornoiseSimulatorWidgetInitializer } from './motornoise-simulator-widget-initializer';

(() => {
    document.addEventListener('DOMContentLoaded', () => {
        new MotornoiseSimulatorWidgetInitializer(() => {
            const el = document.getElementById('motornoise-simulator');
            if (el && el instanceof HTMLTemplateElement) {
                return document.importNode(el.content, true);
            } else {
                return document.createElement('div');
            }
        });
    }, false)
})();