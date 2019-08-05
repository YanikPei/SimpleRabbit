"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require('amqplib');
class QueueConnection {
    constructor(vhost, queueServer) {
        this.queueCon = amqp.connect(process.env.QUEUE_SERVER);
        this.vhost = vhost;
    }
    initSubscribers(subscribeTo) {
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
                                if (msg.properties.replyTo) {
                                    ch.sendToQueue(msg.properties.replyTo, new Buffer(JSON.stringify(res)), {
                                        correlationId: msg.properties.correlationId
                                    });
                                }
                            });
                        }, { noAck: true });
                    });
                });
            });
        });
    }
}
exports.QueueConnection = QueueConnection;
;
//# sourceMappingURL=QueueConnection.js.map