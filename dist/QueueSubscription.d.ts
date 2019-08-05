export interface QueueSubscribtion {
    exchange: string;
    topic: string;
    func: (msg: any) => Promise<any>;
    replyTo?: boolean;
}
//# sourceMappingURL=QueueSubscription.d.ts.map