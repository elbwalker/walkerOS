import { IElbwalker } from '../types';
export declare function ready(run: Function, instance: IElbwalker.Function): void;
export declare function initTrigger(instance: IElbwalker.Function): void;
export declare function triggerLoad(instance: IElbwalker.Function): void;
export declare function triggerVisible(prefix: string, scope: Document | Element, disconnect?: boolean): IntersectionObserver | undefined;
