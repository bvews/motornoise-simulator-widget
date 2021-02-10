// Element: needle, cover, digital numbers, etc.
// Component: gauge, LCD, etc.
class PanelElement {
    private layer = 0;

    constructor(vehicleState: any) {
        this.layer = 0;
    }

    render(canvas: HTMLCanvasElement, vehicleState: any) {
    }
}

class Panel {
    private canvas: HTMLCanvasElement;
    private vehicleState: any;
    private panelElements: any[];

    constructor(canvas: HTMLCanvasElement, vehicleState: any, panelElements: any[]) {
        this.canvas = canvas;
        this.vehicleState = vehicleState;

        this.panelElements = panelElements.sort((a, b) => a.layer - b.layer);
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