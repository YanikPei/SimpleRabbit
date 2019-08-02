export default class QueuePublisherMessage {
    exchange: string;
    routingKey: string;
    message: object;
    queueCon: Promise<any>;

    constructor(exchange: string, routingKey: string, message: object, queueCon: Promise<any>) {
        this.exchange = exchange;
        this.routingKey = routingKey;
        this.message = message;
        this.queueCon = queueCon;

        if(!('tennantID' in this.message)) {
            throw 'message has to include tennantID';
        }
    }

    publish() {
        return this.queueCon.then((con) => {
            return con.createChannel().then((ch) => {
                ch.assertExchange(this.exchange, 'topic', { durable: false })
                    .then(() => {
                        ch.publish(
                            this.exchange,
                            this.routingKey,
                            Buffer.from(JSON.stringify(this.message)),
                            {}
                        );

                        return ch.close();
                    })
            });
        });
    };
};