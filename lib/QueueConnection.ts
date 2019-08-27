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
        let res = null;
        msgJson['vhost'] = this.vhost;

        try {
            res = await subscription.func(msgJson)
        } catch(e) {
            console.log('ERROR 1');
            res = e;
        };
            
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

        });

    }
};