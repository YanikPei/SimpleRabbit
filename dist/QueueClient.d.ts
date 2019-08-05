import { QueueSubscribtion } from './QueueSubscription';
import { QueueVhost } from './QueueVhost';
export declare class QueueClient {
    vhosts: QueueVhost[];
    /**
     * Connect to all available vhosts
     * @param subscribeTo
     */
    connect(subscribeTo: QueueSubscribtion[]): void;
    /**
     * Get vhost connection by name
     * @param name
     */
    private getVhostConnection;
    /**
     * Publish a message to exchange
     * @param exchange
     * @param routingKey
     * @param message
     * @param vhost
     */
    publishMessage(exchange: string, routingKey: string, message: object, vhost?: string): any;
    /**
     * Publish rpc message to exchange and wait for response
     * @param exchange
     * @param routingKey
     * @param message
     * @param vhost
     */
    publishRPCMessage(exchange: string, routingKey: string, message: object, vhost?: string): any;
}
//# sourceMappingURL=QueueClient.d.ts.map