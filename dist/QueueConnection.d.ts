import { QueueSubscribtion } from './QueueSubscription';
export declare class QueueConnection {
    queueCon: any;
    vhost: string;
    constructor(vhost: string, queueServer: string);
    initSubscribers(subscribeTo: QueueSubscribtion[]): void;
}
//# sourceMappingURL=QueueConnection.d.ts.map