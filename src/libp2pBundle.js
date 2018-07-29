const LibP2P = require('libp2p');
const TCP = require('libp2p-tcp');
const secio = require('libp2p-secio');
const spdy = require('libp2p-spdy');
const Mplex = require('libp2p-mplex');
const WS = require('libp2p-websockets');
const defaultsDeep = require('@nodeutils/defaults-deep');

class LibP2PBaseBundle extends LibP2P {
  /**
   * @desc libp2p node that can be used to interact with pangea
   * @param {Object} options options for the base node
   */
  constructor(options) {
    const defaults = {
      modules: {
        transport: [TCP, WS],
        streamMuxer: [spdy, Mplex],
        connEncryption: [secio],
        peerDiscovery: [],
      },
    };
    super(defaultsDeep(options, defaults));
  }
}

module.exports = LibP2PBaseBundle;
