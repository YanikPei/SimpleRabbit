export interface QueueForward {
    exchange: string;
    topic: string;
    msg: object;
};