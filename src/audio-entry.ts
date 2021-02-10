export interface AudioEntry {
    /** File path to audio file.  */
    url: string;
    /** Audio length [sec]. */
    length: number;
    /** Audio leeway [sec]. */
    leeway: number;
    /** Reference to AudioBuffer. */
    buffer?: AudioBuffer;
}
