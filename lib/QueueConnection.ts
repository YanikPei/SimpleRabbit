import { QueueSubscribtion } from './QueueSubscription';
import { QueueForward } from './QueueForward';
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
        let res = {};
        msgJson['vhost'] = this.vhost;

        try {
            res = await subscription.func(msgJson)
        } catch(e) {
            res = e;
        };

        /*
         * Sometimes a rpc message cannot be answered by the current service and has to be
         * forwarded. This way another service can use the replyTo channel and send a response
         * to the client.
         */
        if(res && 'topic' in res && 'exchange' in res && 'msg' in res) {
            channel.publish(
                res['exchange'],
                res['topic'],
                Buffer.from(JSON.stringify(res['msg'])),
                {
                    correlationId: msg.properties.correlationId,
                    replyTo: msg.properties.replyTo
                }
            );

            return;
        }
            
        if(msg.properties.replyTo) {
            channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(res)), {
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