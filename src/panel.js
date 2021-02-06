// Element: needle, cover, digital numbers, etc.
// Component: gauge, LCD, etc.
class PanelElement {
    constructor(vehicleState) {
        this.layer = 0;
    }

    render(canvas, vehicleState) {
    }
}

class Panel {
    constructor(canvas, vehicleState, panelElements) {
        this.canvas = canvas;
        this.vehicleState = vehicleState;

        this.panelElements = panelElements.sort(({layer}, {layer}) => layer - layer);
    }

    render() {
        const canvas = this.canvas;
        const state = this.vehicleState;

        // Clear canvas

        this.panelElements.forEach(element => {
            element.render(canvas, state);
        });
    }
}