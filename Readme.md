# RabbitMQ Client JS

Makes dealing with RabbitMQ easier.

- Simply subscribe to queues
- Supports simple and rpc messages
- Handles setting up and connecting to rabbitMQ

## How to use

Add this library to your project (for example with git submodules). 

```javascript
import { QueueSubscribtion, QueueClient } from 'rabbitmq-client';

/**
 * RABBITMQ_SERVER = URL to RabbitMQ instance
 * QUEUE_KEY = Key of application used by RabbitMQ.
 */
const queueClient = new QueueClient(RABBITMQ_SERVER, QUEUE_KEY);

/**
 * Define queues to subscribe to
 */
const subscribeTo: QueueSubscribtion[] = [{
    exchange: 'meters',
    topic: 'meters.topup.approved',
    func: () => new Promise(() => {})
}];

/**
 * Connect to RabbitMQ
 */
queueClient.connect(subscribeTo);
```