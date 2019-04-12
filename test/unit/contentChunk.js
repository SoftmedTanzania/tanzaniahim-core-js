/* eslint-env mocha */
/* eslint no-unused-expressions:0 */
import should from 'should'
import { extractStringPayloadIntoChunks, retrievePayload } from '../../src/contentChunk'
import { connectionDefault } from '../../src/config'
import mongodb from 'mongodb'

const MongoClient = connectionDefault.client
let db = null

describe('contentChunk: ', () => {
  before(async function() {
    const client = await MongoClient.connect()
    db = client.db()
  });

  after(function() {
    MongoClient.close()
  });

  describe('extractStringPayloadIntoChunks', () => {
    beforeEach(async () => {
      db.collection('fs.files').deleteMany({})
      db.collection('fs.chunks').deleteMany({})
    })

    it('should throw an error when undefined payload is supplied', async () => {
      const payload = undefined

      try {
        await extractStringPayloadIntoChunks(payload)
      } catch (err) {
        should.equal(err instanceof Error, true)
        should.equal(err.message, 'payload not supplied')
      }
    })

    it('should throw an error when null payload is supplied', async () => {
      const payload = null

      try {
        await extractStringPayloadIntoChunks(payload)
      } catch (err) {
        should.equal(err instanceof Error, true)
        should.equal(err.message, 'payload not supplied')
      }
    })

    it('should throw an error when empty payload is supplied', async () => {
      const payload = ''

      try {
        await extractStringPayloadIntoChunks(payload)
      } catch (err) {
        should.equal(err instanceof Error, true)
        should.equal(err.message, 'payload not supplied')
      }
    })

    it('should throw an error when payload type is not supported', async () => {
      const jsonPayload = {
        'string': 'string',
        'boolean': true,
        'object': {
          'property': 'property'
        }
      }

      try {
        await extractStringPayloadIntoChunks(jsonPayload)
      } catch (err) {
        should.equal(err instanceof Error, true)
        should.equal(err.message, 'payload not in the correct format, expecting a string, Buffer, ArrayBuffer, Array, or Array-like Object')
      }
    })

    it('should create the String payload as chucks and return a document id', async () => {
      const payload = 'This is a basic small string payload'
      const payloadLength = payload.length

      const docId = await extractStringPayloadIntoChunks(payload)

      db.collection('fs.files').findOne({_id: docId}, (err, result) => {
        should.ok(result)
        should.deepEqual(result._id, docId)
        should.deepEqual(result.length, payloadLength)
      })
    })

    it('should create the Buffer payload as chucks and return a document id', async () => {
      const payload = Buffer.from('This is a basic small string payload')
      const payloadLength = payload.length

      const docId = await extractStringPayloadIntoChunks(payload)

      db.collection('fs.files').findOne({_id: docId}, (err, result) => {
        should.ok(result)
        should.deepEqual(result._id, docId)
        should.deepEqual(result.length, payloadLength)
      })
    })

    it('should create the Array payload as chucks and return a document id', async () => {
      const payload = [
        'one',
        'two',
        'three'
      ]
      const payloadLength = payload.length

      const docId = await extractStringPayloadIntoChunks(payload)

      db.collection('fs.files').findOne({_id: docId}, (err, result) => {
        should.ok(result)
        should.deepEqual(result._id, docId)
        should.deepEqual(result.length, payloadLength)
      })
    })

    it('should create the ArrayBuffer payload as chucks and return a document id', async () => {
      const arrayBufferLength = 100
      const payload = new ArrayBuffer(arrayBufferLength);

      const docId = await extractStringPayloadIntoChunks(payload)

      db.collection('fs.files').findOne({_id: docId}, (err, result) => {
        should.ok(result)
        should.deepEqual(result._id, docId)
        should.deepEqual(result.length, arrayBufferLength)
      })
    })

    it('should create the Array-like Object payload as chucks and return a document id', async () => {
      const payload = {
        length: 5, // object contains a length property, making it Array-Like
        0: 'First index in array object',
        2: [0,1,2,3,4],
        4: {
          property: "test"
        }
      }
      const payloadLength = payload.length

      const docId = await extractStringPayloadIntoChunks(payload)

      db.collection('fs.files').findOne({_id: docId}, (err, result) => {
        should.ok(result)
        should.deepEqual(result._id, docId)
        should.deepEqual(result.length, payloadLength)
      })
    })

    it('should create the stringified JSON payload as chucks and return a document id', async () => {
      const payload = JSON.stringify({
        string: 'string',
        boolean: true,
        array: [0,1,2,3,4,5],
        object: {
          property: 'property'
        }
      })
      const payloadLength = payload.length

      const docId = await extractStringPayloadIntoChunks(payload)

      db.collection('fs.files').findOne({_id: docId}, (err, result) => {
        should.ok(result)
        should.deepEqual(result._id, docId)
        should.deepEqual(result.length, payloadLength)
      })
    })
  })
})

describe('retrievePayload()', async () => {
  let client
  let db
  before(async () => {
    client = connectionDefault.client
    db = client.db()
  })

  after(() => {
      if(db) {
        db.collection('fs.files').deleteMany({})
        db.collection('fs.chunks').deleteMany({})
      }

      if(client) {
        client.close()
      }
  })

  it('should return an error when the file id is null', (done) => {
      const db = {}
      const fileId = null

      retrievePayload(fileId, (err, body) => {
        err.message.should.eql(`Payload retrieval failed: Payload id: ${fileId} is invalid`)
        done()
      })
  })

  it('should return the body', (done) => {
    const bucket = new mongodb.GridFSBucket(db)
    const stream = bucket.openUploadStream()
    const fileString = `JohnWick,BeowulfJohnWick,BeowulfJohnWick,BeowulfJohnWick,Beowulf
                        JohnWick,BeowulfJohnWick,BeowulfJohnWick,BeowulfJohnWick,Beowulf
                        JohnWick,BeowulfJohnWick,BeowulfJohnWick,BeowulfJohnWick,Beowulf
                        JohnWick,BeowulfJohnWick,BeowulfJohnWick,BeowulfJohnWick,Beowulf
                      `
    let fileId

    stream.on('finish', (doc) => {
      if(doc) {
        fileId = doc._id

        retrievePayload(fileId, (err, body) => {
          body.should.eql(fileString)
        })
        done()
      }
    })

    stream.end(fileString)
  })

  it('should return an error and null when file does not exist', (done) => {
    const bucket = new mongodb.GridFSBucket(db)
    const stream = bucket.openUploadStream()
    const fileString = `JohnWick,BeowulfJohnWick,BeowulfJohnWick,BeowulfJohnWick,Beowulf
                        JohnWick,BeowulfJohnWick,BeowulfJohnWick,BeowulfJohnWick,Beowulf
                        JohnWick,BeowulfJohnWick,BeowulfJohnWick,BeowulfJohnWick,Beowulf
                        JohnWick,BeowulfJohnWick,BeowulfJohnWick,BeowulfJohnWick,Beowulf
                      `
    let fileId

    stream.on('finish', (doc) => {
      if(doc) {
        fileId = '1222332'

        retrievePayload(fileId, (err, body) => {
          err.message.should.eql(
            `Payload retrieval failed: Error in reading stream: FileNotFound: file ${fileId} was not found`)
          done()
        })
      }
    })

    stream.end(fileString)
  })
})
