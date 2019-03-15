# AMQP RPC [![Build Status](https://travis-ci.com/noblesamurai/node-amqprpc.svg?token=PC1JzuQfu665cjyGAsHB&branch=master)](https://travis-ci.com/noblesamurai/node-amqprpc)

> Simple RPC interface for AMQP

## Installation

This module is installed via npm:

``` bash
$ npm install @noblesam/amqprpc
```

## Example Usage

Client side:
```js
const amqplib = require('amqplib');
const { request } = require('@noblesam/amqprpc');
const config = {
  url: 'amqp://guest:guest@127.0.0.1:5672//',
  exchange: 'exchange',
  routingKey: 'sum'
};

const connection = await amqplib.connect(config.url);
try {
  const content = [ 1, 2, 3 ];
  const opts = { exchange: config.exchange, timeout: 5000 };
  const resp = await request(connection, config.routingKey, content, opts);
  // resp = 6
} catch (err) {
  switch (err.name) {
    case 'ChannelClosedError': // the connection was closed unexpectedly.
    case 'NoRouteError': // the specified routing key goes nowhere (server needs to bindQueue).
    case 'ResponseError': // the request returned an error.
    case 'TimeoutError': // the request took more than 5 seconds.
  }
}
```

Server side:
```js
const amqplib = require('amqplib');
const { checkReplyQueue, error, reply } = require('@noblesam/amqprpc');
const config = {
  url: 'amqp://guest:guest@127.0.0.1:5672//',
  exchange: 'exchange',
  queue: 'sum',
  routingKey: 'sum'
};

const connection = await amqplib.connect(config.url);
const consumeChannel = await connection.createChannel();
await consumeChannel.assertQueue(config.queue);
await consumeChannel.bindQueue(config.queue, config.exchange, config.routingKey);
const publishChannel = await connection.createChannel();
consumeChannel.consume(config.queue, async message => {
  if (!await checkReplyQueue(connection, message)) { // the consumer doesn't exist anymore
    return consumeChannel.reject(message, false); // reject and don't requeue
  }
  try {
    const numbers = JSON.parse(message.content);
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    reply(consumeChannel, message, sum, publishChannel);
  } catch (err) {
    // if something went wrong, return an error to the client
    error(consumeChannel, message, err, publishChannel);
  }
});
```

## API

<dl>
<dt><a href="#checkReplyQueue">checkReplyQueue(connection, message)</a> ⇒ <code>boolean</code></dt>
<dd><p>Check if a &quot;reply to&quot; queue exists or not. Will create a separate channel so that it doesn&#39;t
kill an existing one if the queue check fails.</p>
</dd>
<dt><a href="#error">error(channel, message, error, publisherChannel)</a></dt>
<dd><p>Reply to an rpc request with an error. Will automatically nack and not requeue the message after
the error response has been sent.</p>
</dd>
<dt><a href="#reply">reply(channel, message, content, publisherChannel)</a></dt>
<dd><p>Reply to an rpc request. Will automatically ack the message after the response has been sent.</p>
</dd>
<dt><a href="#request">request(connection, key, content)</a> ⇒ <code>*</code></dt>
<dd><p>Make an rpc request. Each request will have its own channel.</p>
</dd>
</dl>

<a name="checkReplyQueue"></a>

## checkReplyQueue(connection, message) ⇒ <code>boolean</code>
Check if a "reply to" queue exists or not. Will create a separate channel so that it doesn't
kill an existing one if the queue check fails.

**Kind**: global function  
**Returns**: <code>boolean</code> - whether the reply queue exists or not  

| Param | Type | Description |
| --- | --- | --- |
| connection | <code>amqplibConnection</code> | amqplib connection |
| message | <code>object</code> | incomming message |

<a name="error"></a>

## error(channel, message, error, publisherChannel)
Reply to an rpc request with an error. Will automatically nack and not requeue the message after
the error response has been sent.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| channel | <code>AmqplibChannel</code> | the amqplib channel on which the message was received |
| message | <code>object</code> | incomming message |
| error | <code>Error</code> | an error object. `{ message, code }` will be returned to the client. |
| publisherChannel | <code>AmqplibChannel</code> | optional separate channel to publish response on |

<a name="reply"></a>

## reply(channel, message, content, publisherChannel)
Reply to an rpc request. Will automatically ack the message after the response has been sent.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| channel | <code>AmqplibChannel</code> | on which the message was received |
| message | <code>object</code> | incomming message |
| content | <code>\*</code> | response message |
| publisherChannel | <code>AmqplibChannel</code> | optional separate channel to publish response on |

<a name="request"></a>

## request(connection, key, content, opts) ⇒ <code>\*</code>
Make an rpc request. Each request will have its own channel.

**Kind**: global function
**Returns**: <code>\*</code> - json decoded response
**Throws**:

- <code>ChannelClosedError</code> when the channel is closed
- <code>NoRouteError</code> if a published message has nowhere to go
- <code>ResponseError</code> if the request returned an error
- <code>TimeoutError</code> after the specified timeout period


| Param | Type | Description |
| --- | --- | --- |
| connection | <code>amqplibConnection</code> | amqplib connection |
| key | <code>string</code> | the routing key for the rpc service |
| content | <code>\*</code> | must be json serialisable |
| opts | <code>object</code> |  |
| opts.exchange | <code>string</code> | the amqp exchange to publish to (defaults to '') |
| opts.timeout | <code>number</code> | optional max time to wait for a response |

Note: To regenerate this section from the jsdoc run `npm run docs` and paste
the output above.

## License

The BSD License

Copyright (c) 2019, Andrew Harris

All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice, this
  list of conditions and the following disclaimer in the documentation and/or
  other materials provided with the distribution.

* Neither the name of the Andrew Harris nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
