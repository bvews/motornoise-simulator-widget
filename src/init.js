(() => {
    document.addEventListener('DOMContentLoaded', () => {
        new MotornoiseSimulatorWidgetInitializer(() => {
            if (document.getElementById('motornoise-simulator').content) {
                return document.importNode(document.getElementById('motornoise-simulator').content, true);
            } else {
                return document.createElement('div');
            }
        });
    }, false)
})();