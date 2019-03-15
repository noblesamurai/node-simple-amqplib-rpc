const expect = require('chai').expect;
const index = require('..');

describe('index', function () {
  it('should export all the functions', function () {
    expect(index).to.respondTo('checkReplyQueue');
    expect(index).to.respondTo('error');
    expect(index).to.respondTo('reply');
    expect(index).to.respondTo('request');
  });
});
