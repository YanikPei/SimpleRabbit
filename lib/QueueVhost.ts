import { QueueConnection } from './QueueConnection';

export interface QueueVhost {
    name: string;
    url: string;
    connection: QueueConnection;
}