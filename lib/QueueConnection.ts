import { QueueSubscribtion } from './QueueSubscription';
const amqp = require('amqplib');

export class QueueConnection {
    queueCon;
    vhost: string;

    constructor(queueServer: string, vhost?: string) {
        this.queueCon = amqp.connect(process.env.QUEUE_SERVER);
        this.vhost = vhost || "";
    }

    async consumeMessage(msg, channel, subscription) {
        const msgJson = JSON.parse(msg.content.toString());
        msgJson['vhost'] = this.vhost;

        const res = await subscription.func(msgJson)
            
        if(msg.properties.replyTo) {
            channel.sendToQueue(msg.properties.replyTo, new Buffer(JSON.stringify(res)), {
                correlationId: msg.properties.correlationId
            });
        }
    }

    async initSubscribers(subscribeTo: QueueSubscribtion[]) {

        const connection = await this.queueCon;
        const channel = await connection.createChannel();

        subscribeTo.forEach(async (sub) => {
    
            await channel.assertExchange(sub.exchange, 'topic', { durable: false });
            const assertedQueue = await channel.assertQueue(sub.topic, { autoDelete: true });
            channel.bindQueue(assertedQueue.queue, sub.exchange, sub.topic);
            channel.consume(assertedQueue.queue, (msg) => this.consumeMessage(msg, channel, sub), { noAck: true });

        })

    /*
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

        */
    
    }
};