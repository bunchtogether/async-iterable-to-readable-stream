//      

const { Readable } = require('stream');

/**
 * Convert an async iterable into a readable stream
 * @param {AsyncIterable<Buffer | string>} iterable
 * @return Readable<Buffer | string>
 */
module.exports = (iterable                               ) => {
  const stream = new Readable({ read: () => {} });
  setImmediate(async () => {
    try {
      for await (const item of iterable) {
        stream.push(item);
      }
      stream.push(null);
    } catch (error) {
      stream.destroy(error);
      return;
    }
    stream.destroy();
  });
  return stream;
};
