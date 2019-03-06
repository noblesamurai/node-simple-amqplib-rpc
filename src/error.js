module.exports = error;

/**
 * Reply to an rpc request with an error. Will automatically nack and not requeue the message after
 * the error response has been sent.
 *
 * @param {AmqplibChannel} channel the amqplib channel on which the message was received
 * @param {object} message incomming message
 * @param {Error} error an error object. `{ message, code }` will be returned to the client.
 * @param {AmqplibChannel} publisherChannel optional separate channel to publish response on
 */
async function error (channel, message, error, publisherChannel = channel) {
  const payload = Buffer.from(JSON.stringify({ message: error.message, code: error.code }));
  await publisherChannel.sendToQueue(message.properties.replyTo, payload, { type: 'error' });
  channel.reject(message, false);
}
