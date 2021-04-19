const expect = require('chai').expect;
const EventEmitter = require('events');
const checkReplyQueue = require('../src/check-reply-queue');

class Channel extends EventEmitter {
  async checkQueue (queue) {
    if (queue === 'exists') return { queue, messageCount: 0, consumerCount: 1 };
    this.emit('error', new Error(`Channel closed by server: 404 (NOT-FOUND) with message "NOT_FOUND - no queue '${queue}' in host '/'"`));
    throw new Error(`Operation failed: QueueDeclare; 404 (NOT-FOUND) with message "NOT_FOUND - no queue '${queue}' in vhost '/'"`);
  }

  close () {}
}
const connection = {
  createChannel: async () => new Channel()
};

describe('check reply queue', function () {
  it('should return true if the reply queue exists', async function () {
    const exists = await checkReplyQueue(connection, { properties: { replyTo: 'exists' } });
    expect(exists).to.be.true();
  });

  it('should return false if the reply queue does not exist', async function () {
    const exists = await checkReplyQueue(connection, { properties: { replyTo: 'doesnotexist' } });
    expect(exists).to.be.false();
  });
});
