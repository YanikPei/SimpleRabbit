const amqp = require('amqplib');
import QueueSubscribtion from './QueueSubscription';
export const queueCon = amqp.connect(process.env.QUEUE_SERVER);

export function initSubscribers(subscribeTo: QueueSubscribtion[]) {

    queueCon.then((con) => {
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
