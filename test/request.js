const EventEmitter = require('events');
const expect = require('chai').expect;
const sinon = require('sinon');
const request = require('../src/request');

class Channel extends EventEmitter {
  constructor (response) {
    super();
    this.response = response;
  }
  async checkQueue (queue) {
    if (queue === 'exists') return { queue, messageCount: 0, consumerCount: 1 };
    this.emit('error', new Error(`Channel closed by server: 404 (NOT-FOUND) with message "NOT_FOUND - no queue '${queue}' in host '/'"`));
    throw new Error(`Operation failed: QueueDeclare; 404 (NOT-FOUND) with message "NOT_FOUND - no queue '${queue}' in vhost '/'"`);
  }
  publish (exchange, key, payload, opts = {}) {}
  consume (queue, handler, opts = {}) {
    if (queue === 'amq.rabbitmq.reply-to' && !opts.noAck) {
      throw new Error('Channel closed by server: 406 (PRECONDITION-FAILED) with message "PRECONDITION_FAILED - reply consumer cannot acknowledge"');
    }
    if (this.response) handler(this.response);
  }
  close () {
    this.emit('close');
  }
}

describe('request', function () {
  it('should request and receive response from amqp rpc request', async function () {
    const response = 'SUCCESS';
    const channel = new Channel(
      { content: JSON.stringify(response), properties: { type: 'success' } }
    );
    sinon.spy(channel, 'publish');
    sinon.spy(channel, 'consume');
    const connection = { createConfirmChannel: async () => channel };
    const key = 'test';
    const content = 'REQUEST';
    const opts = { exchange: 'exchange' };
    const resp = await request(connection, key, content, opts);
    expect(resp).to.equal(response);
    expect(channel.publish).to.be.calledWith(
      opts.exchange,
      key,
      sinon.match.instanceOf(Buffer).and(sinon.match(val => val.toString() === JSON.stringify(content))),
      { replyTo: 'amq.rabbitmq.reply-to', mandatory: true }
    );
    expect(channel.consume).to.be.calledWith(
      'amq.rabbitmq.reply-to',
      sinon.match.func,
      { noAck: true }
    );
  });

  it('should throw a "channel closed" error', async function () {
    const channel = new Channel(false);
    // trigger close event on next tick after publish call
    channel.publish = () => setTimeout(() => channel.close(), 0);
    const connection = { createConfirmChannel: async () => channel };
    const promise = request(connection, 'test', 'REQUEST');
    await expect(promise).to.eventually.be.rejected.with.property('name', 'ChannelClosedError');
  });

  it('should throw a "no route" error', async function () {
    const channel = new Channel(false);
    // trigger return event on next tick after publish call
    channel.publish = () => setTimeout(() => channel.emit('return', { fields: { replyText: 'NO_ROUTE' } }), 0);
    const connection = { createConfirmChannel: async () => channel };
    const promise = request(connection, 'test', 'REQUEST');
    await expect(promise).to.eventually.be.rejected.with.property('name', 'NoRouteError');
  });

  it('should throw a "response" error', async function () {
    const message = 'BOOM!!!';
    const code = 42;
    const channel = new Channel(
      { content: JSON.stringify({ message, code }), properties: { type: 'error' } }
    );
    const connection = { createConfirmChannel: async () => channel };
    const promise = request(connection, 'test', 'REQUEST');
    await expect(promise).to.eventually.be.rejected.to.include({ name: 'ResponseError', message, code });
  });
});
