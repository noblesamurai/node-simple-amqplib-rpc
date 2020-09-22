const errorEx = require('error-ex');
const pEvent = require('p-event');

module.exports = request;

// named errors
const ChannelClosedError = errorEx('ChannelClosedError');
const NoRouteError = errorEx('NoRouteError');
const ResponseError = errorEx('ResponseError');

/**
 * @private
 * Get a promise that will throw on channel close or after a timeout period (if set).
 *
 * @async
 * @param {amqplibChannel} channel
 * @param {number} opts.timeout optional timeout period.
 * @throws {ChannelClosedError} when the channel is closed
 * @throws {TimeoutError} after the specified timeout period
 */
const getChannelCloseOrTimeoutEventPromise = async (channel, opts) => {
  await pEvent(channel, 'close', opts);
  throw new ChannelClosedError('channel closed');
};

/**
 * @private
 * Wait for the first 'basic.return' event and check if it contains a NO_ROUTE error.
 * If no route could be found (ie. whatever we published didn't get sent anywhere) throw an error.
 *
 * @async
 * @param {amqplibChannel} channel
 * @throws {NoRouteError} if a published message has nowhere to go
 */
const getChannelResponseEventPromise = async (channel, key) => {
  const returnEvent = await pEvent(channel, 'return');
  if (returnEvent.fields.replyText === 'NO_ROUTE') {
    throw new NoRouteError(`no route found for: "${key}"`);
  }
  console.log(returnEvent);
};

/**
 * @private
 * Returns a promise that resolves with the rpc response data.
 *
 * @async
 * @param {amqplibChannel} channel
 * @return {*} json decoded response
 * @throws {NoRouteError} if a published message has nowhere to go
 */
const getResponsePromise = (channel, key) => new Promise((resolve, reject) => {
  // reject if we get a NO_ROUTE response any time before we consume the reply message.
  getChannelResponseEventPromise(channel, key).catch(reject);

  // attach the reply consumer...
  channel.consume('amq.rabbitmq.reply-to', messageHandler, { noAck: true });

  function messageHandler (message) {
    try {
      resolve(parseResponse(message));
    } catch (err) {
      reject(err);
    }
  }
});

/**
 * @private
 * Parse the response message.
 *
 * @param {object} message
 * @return {*} parsed json
 * @throws {ResponseError} if the error message contained an error response
 */
function parseResponse (message) {
  const content = JSON.parse(message.content);
  if (message.properties.type === 'error') {
    const error = new ResponseError(content.message);
    error.code = content.code;
    throw error;
  }
  return content;
}

/**
 * Make an rpc request. Each request will have its own channel.
 *
 * @async
 * @param {amqplibConnection} connection amqplib connection
 * @param {string} key the routing key for the rpc service
 * @param {*} content must be json serialisable
 * @param {object} opts
 * @param {string} opts.exchange the amqp exchange to publish to (defaults to '')
 * @param {number} opts.timeout optional max time to wait for a response
 * @return {*} json decoded response
 * @throws {ChannelClosedError} when the channel is closed
 * @throws {NoRouteError} if a published message has nowhere to go
 * @throws {ResponseError} if the request returned an error
 * @throws {TimeoutError} after the specified timeout period
 */
async function request (connection, key, content, opts = {}) {
  const channel = await connection.createConfirmChannel();
  const { exchange = '' } = opts;
  const payload = Buffer.from(JSON.stringify(content));
  const responsePromise = getResponsePromise(channel, key);
  channel.publish(exchange, key, payload, { replyTo: 'amq.rabbitmq.reply-to', mandatory: true });
  try {
    const res = await Promise.race([
      responsePromise,
      getChannelCloseOrTimeoutEventPromise(channel, opts)
    ]);
    return res;
  } finally {
    // close ignoring any errors (incase the channel has already closed) so that
    // any error thrown in the above try is still actually thrown rather than
    // overridden here by the channel close error instead.
    await channel.close().catch(() => {});
  }
}
