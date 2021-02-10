export interface AudioEntry {
    url: string;
    length: number;
    leeway: number;
    buffer?: AudioBuffer;
}
