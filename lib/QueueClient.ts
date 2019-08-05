var UUID = require('uuid-js');

import { QueueSubscribtion } from './QueueSubscription';
import { QueueVhost } from './QueueVhost';
import { QueueConnection } from './QueueConnection';

export class QueueClient {
    vhosts: QueueVhost[] = [];
    vhostURLs: string[] = [];

    constructor(vhostURLs) {
        this.vhostURLs = vhostURLs;
    }

    /**
     * Connect to all available vhosts
     * @param subscribeTo 
     */
    connect(subscribeTo: QueueSubscribtion[]) {
        this.vhostURLs.forEach((vhostURL) => {

            // create connection
            const vhostArr = vhostURL.split('/');
            const vhostName = vhostArr[vhostArr.length -1];
            const vhost: QueueVhost = {
                name: vhostName,
                url: vhostURL,
                connection: new QueueConnection(vhostName, vhostURL),
            }
            this.vhosts.push(vhost);

            // connect to channels
            vhost.connection.initSubscribers(subscribeTo);
        });
    }

    /**
     * Get vhost connection by name
     * @param name 
     */
    private getVhostConnection(name: string): Promise<any> {
        return new Promise(() => {
            this.vhosts.forEach(vhost => {
                if(vhost.name === name) return vhost.connection.queueCon;
            });

            throw `vhost '${name}' not found`;
        });
    }

    /**
     * Publish a message to exchange
     * @param exchange 
     * @param routingKey 
     * @param message 
     * @param vhost 
     */
    publishMessage(exchange: string, routingKey: string, message: object, vhost?: string) {
        let vhostConn = this.vhosts[0].connection.queueCon;

        if(vhost) {
            vhostConn = this.getVhostConnection(vhost);
        }
        

        return vhostConn.then((con) => {
            return con.createChannel().then((ch) => {
                ch.assertExchange(exchange, 'topic', { durable: false })
                    .then(() => {
                        ch.publish(
                            exchange,
                            routingKey,
                            Buffer.from(JSON.stringify(message)),
                            {}
                        );

                        return ch.close();
                    })
            });
        });
    }

    /**
     * Publish rpc message to exchange and wait for response
     * @param exchange 
     * @param routingKey 
     * @param message 
     * @param vhost 
     */
    publishRPCMessage(exchange: string, routingKey: string, message: object, vhost?: string) {
        const correlationID = UUID.create(4).toString();
        let vhostConn = this.vhosts[0].connection.queueCon;

        if(vhost) {
            vhostConn = this.getVhostConnection(vhost);
        }
        

        return vhostConn.then((con) => {
            return con.createChannel().then((ch) => {
                ch.assertQueue('', {
                    exclusive: true
                })
                    .then((q) => {

                        // listen for callback
                        ch.consume(q.queue, (msg) => {
                            if (msg.properties.correlationId == correlationID) {
                                const msgJson = JSON.parse(msg.content.toString());
                                console.log('Response: ' + JSON.stringify(msg));
                                ch.close();
                                
                                return new Promise(() => {
                                    return msgJson;
                                });
                            }
                        }, {
                                noAck: true
                            });


                        // send message
                        ch.assertExchange(exchange, 'topic', { durable: false })
                            .then(() => {
                                ch.publish(
                                    exchange,
                                    routingKey,
                                    Buffer.from(JSON.stringify(message)),
                                    {
                                        correlationId: correlationID,
                                        replyTo: q.queue
                                    }
                                );
                            });
                    })
            });
        })
    }
}