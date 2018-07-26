const Node = require('../libp2pBundle');
const pull = require('pull-stream');
const Pushable = require('pull-pushable');
const qrcode = require('qrcode-terminal');
const {
    createNewPeerInfo
} = require('../utils');

/**
 * @desc create new logger node listener
 * @return {Promise<undefined>}
 */
const loggerNode = () => new Promise((res, rej) => {

    createNewPeerInfo()
        .then((peerInfo) => {

            const node = new Node({peerInfo: peerInfo});
            const p = Pushable();

            peerInfo.multiaddrs.forEach((addr) => {
                qrcode.generate(addr.toString());
                console.log(`Address: ${addr.toString()}`)
            });

            node.start((err) => {

                if (err){
                    return rej(err)
                }

                node.handle('/pangea/logger/1.0.0', (protocol, conn) => {

                    pull(
                        p,
                        conn
                    );

                    pull(
                        conn,
                        pull.map((data) => {
                            console.log(data);
                            return data.toString('utf8').replace('\n', '')
                        }),
                    );

                });

                res()

            });

        })

});

module.exports = loggerNode;
