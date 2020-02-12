var UUID = require('uuid-js');

import { QueueSubscribtion } from './QueueSubscription';
import { QueueVhost } from './QueueVhost';
import { QueueConnection } from './QueueConnection';
import e = require('express');

export class QueueClient {
    vhosts: QueueVhost[] = [];
    vhostURLs: string[] = [];
    applicationID: string;

    constructor(vhostURLs, applicationID) {
        this.vhostURLs = vhostURLs;
        this.applicationID = applicationID;
    }

    /**
     * Connect to all available vhosts
     * @param subscribeTo 
     */
    connect(subscribeTo: QueueSubscribtion[]) {
        if(this.vhostURLs.length <= 0) throw 'Please provide at least one vhost url';
        
        // support connecting to multiple vhosts
        this.vhostURLs.forEach((vhostURL) => {

            // create connection
            const vhostArr = vhostURL.split('/');
            const vhostName = vhostArr[vhostArr.length -1];
            const vhost: QueueVhost = {
                name: vhostName,
                url: vhostURL,
                connection: new QueueConnection(vhostName, this.applicationID, vhostURL),
            }
            this.vhosts.push(vhost);

            // connect to channels
            vhost.connection.initSubscribers(subscribeTo);
        });
    }

    /**
     * Get vhost connection by name
     * @param name 
     */
    private getVhostConnection(name: string): Promise<any> {
        return new Promise(() => {
            this.vhosts.forEach(vhost => {
                if(vhost.name === name) return vhost.connection.queueCon;
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
    async publishMessage(exchange: string, routingKey: string, message: object, vhost?: string) {
        let vhostConn = this.vhosts[0].connection.queueCon;

        try {
            this.validateMessage(message);
        } catch(e) {
            throw e;
        }

        if(vhost) {
            vhostConn = this.getVhostConnection(vhost);
        }

        try {
            const connection = await vhostConn;
            const channel = await connection.createChannel();
            await channel.assertExchange(exchange, 'topic', { durable: false });
            channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {});
            channel.close();
        } catch(e) {
            throw JSON.stringify(e);
        }
    }

    /**
     * Publish rpc message to exchange and wait for response
     * @param exchange 
     * @param routingKey 
     * @param message 
     * @param vhost 
     */
    async publishRPCMessage(exchange: string, routingKey: string, message: object, callback: (msg) => void, vhost?: string): Promise<Object> {
        const correlationID = UUID.create(4).toString();
        let vhostConn = this.vhosts[0].connection.queueCon;

        try {
            this.validateMessage(message);
        } catch(e) {
            throw e;
        }     

        if(vhost) {
            vhostConn = this.getVhostConnection(vhost);
        }

        const connection = await vhostConn;
        const channel = await connection.createChannel();
        const queue = await channel.assertQueue('', {exclusive: true});

        // send message
        await channel.assertExchange(exchange, 'topic', { durable: false })
        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(message)),
            {
                correlationId: correlationID,
                replyTo: queue.queue
            }
        );

        // listen for callback
        return await channel.consume(queue.queue, async (msg) => {
            if (msg && 'properties' in msg && msg.properties.correlationId == correlationID) {
                const msgJson = JSON.parse(msg.content.toString());
                await channel.deleteQueue(queue.queue);
                await channel.close();

                callback(msgJson);
            }
        }, {noAck: true});
            
    }

    validateMessage(message) {
        let error = false;
        if (!("tenantID" in message)) throw "TenantID is required";

        return !error;
    }
}