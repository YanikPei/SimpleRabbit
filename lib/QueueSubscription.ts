export interface QueueSubscribtion {
    exchange: string;
    topic: string;
    func: (msg, headers?, fields?) => Promise<any>;
    replyTo?: boolean;
    durable?: boolean;
    internal?: boolean;
};