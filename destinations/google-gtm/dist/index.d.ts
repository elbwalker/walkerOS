import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
        dataLayer?: unknown[];
    }
}
export interface DestinationGTM extends WebDestination.Function {
}
export declare const destination: DestinationGTM;
export default destination;
