import { QueueSubscribtion } from './QueueSubscription';
const amqp = require('amqplib');

export class QueueConnection {
    queueCon;
    vhost: string;

    constructor(queueServer: string, vhost?: string) {
        this.queueCon = amqp.connect(process.env.QUEUE_SERVER);
        this.vhost = vhost || "";
    }

    async initSubscribers(subscribeTo: QueueSubscribtion[]) {

        const con = await this.queueCon;
        const ch = await con.createChannel();

        subscribeTo.forEach(async (sub) => {
    
            await ch.assertExchange(sub.exchange, 'topic', { durable: false });
            const qok = await ch.assertQueue(sub.topic, { autoDelete: true });
            ch.bindQueue(qok.queue, sub.exchange, sub.topic);
            ch.consume(qok.queue, async (msg) => {

                const msgJson = JSON.parse(msg.content.toString());
                msgJson['vhost'] = this.vhost;

                const res = await sub.func(msgJson)
                    
                if(msg.properties.replyTo) {
                    ch.sendToQueue(msg.properties.replyTo, new Buffer(JSON.stringify(res)), {
                        correlationId: msg.properties.correlationId
                    });
                }

            }, { noAck: true });

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