var UUID = require('uuid-js');

export class QueueRPCMessage {
    callbackQueue: string;
    exchange: string;
    routingKey: string;
    queueCon: Promise<any>;
    message: object;
    correlation_id: number;

    constructor(exchange: string, routingKey: string, queueCon: Promise<any>, message: object) {
        this.exchange = exchange;
        this.routingKey = routingKey;
        this.queueCon = queueCon;
        this.message = message;
        this.callbackQueue = "";
        this.correlation_id = UUID.create(4).toString();

        if(!('tennantID' in this.message)) {
            throw 'message has to include tennantID';
        }
    }

    publish() {
        return this.queueCon.then((con) => {
            return con.createChannel().then((ch) => {
                ch.assertQueue('', {
                    exclusive: true
                })
                    .then((q) => {

                        // listen for callback
                        ch.consume(q.queue, (msg) => {
                            if (msg.properties.correlationId == this.correlation_id) {
                                ch.close();
                            }
                        }, {
                                noAck: true
                            });


                        // send message
                        ch.assertExchange(this.exchange, 'topic', { durable: false })
                            .then(() => {
                                return ch.publish(
                                    this.exchange,
                                    this.routingKey,
                                    Buffer.from(JSON.stringify(this.message)),
                                    {
                                        correlationId: this.correlation_id,
                                        replyTo: q.queue
                                    }
                                );
                            });
                    })
            });
        })
    }


}