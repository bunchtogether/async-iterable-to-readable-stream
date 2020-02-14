// @flow

const asyncIterableToReadableStream = require('../src');
const crypto = require('crypto');
const expect = require('expect');

describe('Async Iterable to Readable Stream', () => {
  test('Converts an async iterable to a readable stream', async () => {
    const chunks = [
      crypto.randomBytes(Math.round(Math.random() * 256)),
      crypto.randomBytes(Math.round(Math.random() * 256)),
      crypto.randomBytes(Math.round(Math.random() * 256)),
      crypto.randomBytes(Math.round(Math.random() * 256)),
    ];
    async function* getChunks() {
      for (const item of chunks) {
        await new Promise((resolve) => setImmediate(resolve));
        yield item;
      }
    }
    let i = 0;
    for await (const chunk of getChunks()) {
      expect(Buffer.compare(chunk, chunks[i])).toEqual(0);
      i += 1;
    }
    const stream = asyncIterableToReadableStream(getChunks());
    let j = 0;
    const dataPromise = new Promise((resolve, reject) => {
      const handleData = (chunk) => {
        expect(Buffer.compare(chunk, chunks[j])).toEqual(0);
        j += 1;
        if (j >= chunks.length) {
          stream.removeListener('data', handleData);
          stream.removeListener('error', handleError);
          resolve();
        }
      };
      const handleError = (error) => {
        stream.removeListener('data', handleData);
        stream.removeListener('error', handleError);
        reject(error);
      };
      stream.on('data', handleData);
      stream.on('error', handleError);
    });
    const endPromise = new Promise((resolve, reject) => {
      const handleEnd = () => {
        stream.removeListener('end', handleEnd);
        stream.removeListener('error', handleError);
        resolve();
      };
      const handleError = (error) => {
        stream.removeListener('end', handleEnd);
        stream.removeListener('error', handleError);
        reject(error);
      };
      stream.on('end', handleEnd);
      stream.on('error', handleError);
    });
    const closePromise = new Promise((resolve, reject) => {
      const handleClose = () => {
        stream.removeListener('close', handleClose);
        stream.removeListener('error', handleError);
        resolve();
      };
      const handleError = (error) => {
        stream.removeListener('close', handleClose);
        stream.removeListener('error', handleError);
        reject(error);
      };
      stream.on('close', handleClose);
      stream.on('error', handleError);
    });
    await dataPromise;
    await endPromise;
    await closePromise;
  });
  test('Emits errors from the stream', async () => {
    const errorMessage = `${Math.random()}`;
    async function* getChunksWithError() {
      await new Promise((resolve) => setImmediate(resolve));
      yield crypto.randomBytes(Math.round(Math.random() * 256));
      await new Promise((resolve) => setImmediate(resolve));
      throw new Error(errorMessage);
    }
    const stream = asyncIterableToReadableStream(getChunksWithError());
    const endPromise = new Promise((resolve, reject) => {
      const handleEnd = () => {
        stream.removeListener('end', handleEnd);
        stream.removeListener('error', handleError);
        reject(new Error('Stream with error should not end'));
      };
      const handleError = (error) => {
        expect(error.message).toEqual(error.message);
        stream.removeListener('end', handleEnd);
        stream.removeListener('error', handleError);
        resolve(error);
      };
      stream.on('end', handleEnd);
      stream.on('error', handleError);
    });
    const closePromise = new Promise((resolve) => {
      const handleClose = () => {
        stream.removeListener('close', handleClose);
        resolve();
      };
      stream.on('close', handleClose);
    });
    await endPromise;
    await closePromise;
  });
});

