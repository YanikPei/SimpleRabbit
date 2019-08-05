"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var UUID = require('uuid-js');
const QueueConnection_1 = require("./QueueConnection");
class QueueClient {
    constructor(vhostURLs) {
        this.vhosts = [];
        this.vhostURLs = [];
        this.vhostURLs = vhostURLs;
    }
    /**
     * Connect to all available vhosts
     * @param subscribeTo
     */
    connect(subscribeTo) {
        this.vhostURLs.forEach((vhostURL) => {
            // create connection
            const vhostArr = vhostURL.split('/');
            const vhostName = vhostArr[vhostArr.length - 1];
            const vhost = {
                name: vhostName,
                url: vhostURL,
                connection: new QueueConnection_1.QueueConnection(vhostName, vhostURL),
            };
            this.vhosts.push(vhost);
            // connect to channels
            vhost.connection.initSubscribers(subscribeTo);
        });
    }
    /**
     * Get vhost connection by name
     * @param name
     */
    getVhostConnection(name) {
        return new Promise(() => {
            this.vhosts.forEach(vhost => {
                if (vhost.name === name)
                    return vhost.connection.queueCon;
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
    publishMessage(exchange, routingKey, message, vhost) {
        let vhostConn = this.vhosts[0].connection.queueCon;
        if (vhost) {
            vhostConn = this.getVhostConnection(vhost);
        }
        return vhostConn.then((con) => {
            return con.createChannel().then((ch) => {
                ch.assertExchange(exchange, 'topic', { durable: false })
                    .then(() => {
                    ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {});
                    return ch.close();
                });
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
    publishRPCMessage(exchange, routingKey, message, vhost) {
        const correlationID = UUID.create(4).toString();
        let vhostConn = this.vhosts[0].connection.queueCon;
        if (vhost) {
            vhostConn = this.getVhostConnection(vhost);
        }
        return vhostConn.then((con) => {
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
                        ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
                            correlationId: correlationID,
                            replyTo: q.queue
                        });
                    });
                });
            });
        });
    }
}
exports.QueueClient = QueueClient;
//# sourceMappingURL=QueueClient.js.map