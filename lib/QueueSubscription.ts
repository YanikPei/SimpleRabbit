export default interface QueueSubscribtion {
    exchange: string;
    topic: string;
    func: (msg) => Promise<any>;
    replyTo?: boolean;
};