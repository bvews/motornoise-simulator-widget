(function () {
    document.addEventListener('DOMContentLoaded', function () {
        'use strict';
        new MotornoiseSimulatorWidgetSet(function () {
            if (document.getElementById('motornoise-simulator').content) {
                return document.importNode(document.getElementById('motornoise-simulator').content, true);
            } else {
                return document.createElement('div');
            }
        });
    }, false)
})();