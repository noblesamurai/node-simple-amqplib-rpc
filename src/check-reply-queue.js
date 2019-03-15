module.exports = checkReplyQueue;

/**
 * Check if a "reply to" queue exists or not. Will create a separate channel so that it doesn't
 * kill an existing one if the queue check fails.
 *
 * @param {amqplibConnection} connection amqplib connection
 * @param {object} message incomming message
 * @return {boolean} whether the reply queue exists or not
 */
async function checkReplyQueue (connection, message) {
  const channel = await connection.createChannel();
  try {
    channel.on('error', () => {}); // ignore errors thrown from failed checks.
    await channel.checkQueue(message.properties.replyTo);
    channel.close();
    return true;
  } catch (err) {
    return false;
  }
}
