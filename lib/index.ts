const amqp = require('amqplib');
import {QueueSubscribtion} from './QueueSubscription';

export * from "./QueuePublisherMessage";
export * from "./QueueRPCMessage";
export * from "./QueueSubscription";

export class QueueConnection {
    queueCon;

    constructor(queueServer: string) {
        this.queueCon = amqp.connect(process.env.QUEUE_SERVER);
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
    
                                sub.func(JSON.parse(msg.content.toString()))
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
