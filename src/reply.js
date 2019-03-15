module.exports = reply;

/**
 * Reply to an rpc request. Will automatically ack the message after the response has been sent.
 *
 * @param {AmqplibChannel} channel on which the message was received
 * @param {object} message incomming message
 * @param {*} content response message
 * @param {AmqplibChannel} publisherChannel optional separate channel to publish response on
 */
async function reply (channel, message, content, publisherChannel = channel) {
  const payload = Buffer.from(JSON.stringify(content));
  await publisherChannel.sendToQueue(message.properties.replyTo, payload, { type: 'success' });
  channel.ack(message);
}
