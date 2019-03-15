const expect = require('chai').expect;
const sinon = require('sinon');
const reply = require('../src/reply');

describe('reply', function () {
  it('should reply on the consumer channel', async function () {
    const channel = {
      sendToQueue: sinon.stub().resolves(),
      ack: sinon.stub().returns()
    };
    const message = { properties: { replyTo: 'reply-queue' } };
    const content = { test: 'foo' };
    await reply(channel, message, content);
    expect(channel.sendToQueue).to.have.been.calledWith(
      message.properties.replyTo,
      sinon.match.instanceOf(Buffer).and(sinon.match(val => val.toString() === JSON.stringify(content))),
      { type: 'success' }
    );
    expect(channel.ack).to.have.been.calledWith(message);
  });

  it('should reply on the separate publishing channel', async function () {
    const channel = {
      sendToQueue: sinon.stub().resolves(),
      ack: sinon.stub().returns()
    };
    const message = { properties: { replyTo: 'reply-queue' } };
    const content = { test: 'foo' };
    const publisherChannel = {
      sendToQueue: sinon.stub().resolves(),
      ack: sinon.stub().returns()
    };
    await reply(channel, message, content, publisherChannel);
    expect(channel.sendToQueue).to.not.have.been.called();
    expect(publisherChannel.sendToQueue).to.have.been.calledWith(
      message.properties.replyTo,
      sinon.match.instanceOf(Buffer),
      { type: 'success' }
    );
    expect(channel.ack).to.have.been.calledWith(message);
    expect(publisherChannel.ack).to.not.have.been.called();
  });
});
