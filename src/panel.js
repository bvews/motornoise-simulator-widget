// Element: needle, cover, digital numbers, etc.
// Component: gauge, LCD, etc.
function PanelElement(vehicleState) {
    this.layer = 0;
}

PanelElement.prototype.render = function (canvas, vehicleState) {
};

function Panel(canvas, vehicleState, panelElements) {
    this.canvas = canvas;
    this.vehicleState = vehicleState;

    this.panelElements = panelElements.sort(function (a, b) {
        return a.layer - b.layer;
    });
}

Panel.prototype.render = function () {
    const canvas = this.canvas;
    const state = this.vehicleState;

    // Clear canvas

    this.panelElements.forEach(element => {
        element.render(canvas, state);
    });
};