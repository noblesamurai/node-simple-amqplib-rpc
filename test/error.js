const expect = require('chai').expect;
const sinon = require('sinon');
const error = require('../src/error');

describe('error', function () {
  it('should return an error on the consumer channel', async function () {
    const channel = {
      sendToQueue: sinon.stub().resolves(),
      reject: sinon.stub().returns()
    };
    const message = { properties: { replyTo: 'reply-queue' } };
    const err = new Error('bang!!!');
    error.code = 42;
    await error(channel, message, err);
    expect(channel.sendToQueue).to.have.been.calledWith(
      message.properties.replyTo,
      sinon.match.instanceOf(Buffer).and(sinon.match(val => {
        const { message, code } = JSON.parse(val);
        return message === err.message && code === err.code;
      })),
      { type: 'error' }
    );
    expect(channel.reject).to.have.been.calledWith(message);
  });

  it('should return an error on the separate publishing channel', async function () {
    const channel = {
      sendToQueue: sinon.stub().resolves(),
      reject: sinon.stub().returns()
    };
    const message = { properties: { replyTo: 'reply-queue' } };
    const err = new Error('bang!!!');
    const publisherChannel = {
      sendToQueue: sinon.stub().resolves(),
      reject: sinon.stub().returns()
    };
    await error(channel, message, err, publisherChannel);
    expect(channel.sendToQueue).to.not.have.been.called();
    expect(publisherChannel.sendToQueue).to.have.been.calledWith(
      message.properties.replyTo,
      sinon.match.instanceOf(Buffer),
      { type: 'error' }
    );
    expect(channel.reject).to.have.been.calledWith(message);
    expect(publisherChannel.reject).to.not.have.been.called();
  });
});
