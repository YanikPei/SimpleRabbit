const amqp = require('amqplib');
var UUID = require('uuid-js');
import {QueueSubscribtion} from './QueueSubscription';

export * from "./QueuePublisherMessage";
export * from "./QueueRPCMessage";
export * from "./QueueSubscription";

const vhostURLs = [
    'amqp://energierevolte:test12345@212.227.206.129/test',
    'amqp://energierevolte:test12345@212.227.206.129/stawag'
];

interface QueueVhost {
    name: string;
    url: string;
    connection: QueueConnection;
}

export class QueueClient {
    vhosts: QueueVhost[] = [];

    /**
     * Connect to all available vhosts
     * @param subscribeTo 
     */
    connect(subscribeTo: QueueSubscribtion[]) {
        vhostURLs.forEach((vhostURL) => {

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
    publishMessage(exchange: string, routingKey: string, message: object, vhost: string) {
        return this.getVhostConnection(vhost).then((con) => {
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
    publishRPCMessage(exchange: string, routingKey: string, message: object, vhost: string) {
        const correlationID = UUID.create(4).toString();

        return this.getVhostConnection(vhost).then((con) => {
            return con.createChannel().then((ch) => {
                ch.assertQueue('', {
                    exclusive: true
                })
                    .then((q) => {

                        // listen for callback
                        ch.consume(q.queue, (msg) => {
                            if (msg.properties.correlationId == correlationID) {
                                console.log('Response: ' + JSON.stringify(msg));
                                ch.close();
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

export class QueueConnection {
    queueCon;
    vhost: string;

    constructor(vhost: string, queueServer: string) {
        this.queueCon = amqp.connect(process.env.QUEUE_SERVER);
        this.vhost = vhost;
    }

    initSubscribers(subscribeTo: QueueSubscribtion[]) {

        this.queueCon.then((con) => {
            con.createChannel().then((ch) => {
    
                subscribeTo.forEach((sub) => {
    
                    ch.assertExchange(sub.exchange, 'topic', { durable: false })
                        .then(() => {
                            return ch.assertQueue(sub.topic, { autoDelete: true });
                        })
                        .then((qok) => {
                            ch.bindQueue(qok.queue, sub.exchange, sub.topic);
                            return qok.queue;
                        })
                        .then((queue) => {
                            return ch.consume(queue, (msg) => {

                                const msgJson = JSON.parse(msg.content.toString());
                                msgJson['vhost'] = this.vhost;
    
                                sub.func(msgJson)
                                    .then(res => {
                                        if(msg.properties.replyTo) {
                                            ch.sendToQueue(msg.properties.replyTo, new Buffer(JSON.stringify(res)), {
                                                correlationId: msg.properties.correlationId
                                            });
                                        }
                                    });
                            }, { noAck: true });
                        })
                })
    
            })
        });
    
    }
};
