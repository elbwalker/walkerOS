import { WebDestination } from "../../types";
declare global {
    interface Window {
        dataLayer?: unknown[];
    }
}
export interface DestinationGTM extends WebDestination.Function {
    config: WebDestination.Config;
}
export declare const destination: WebDestination.Function;
export default destination;
