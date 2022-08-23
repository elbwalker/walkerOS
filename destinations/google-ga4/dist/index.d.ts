import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag: Function;
    }
}
export interface DestinationGA4 extends WebDestination.Function {
    config: WebDestination.Config & {
        measurementId?: string;
        transport_url?: string;
    };
}
export declare const destination: DestinationGA4;
export default destination;
