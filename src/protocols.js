const Node = require('./libp2pBundle');
const pull = require('pull-stream');
const Pushable = require('pull-pushable');
const qrcode = require('qrcode-terminal');
const {
    createNewPeerInfo
} = require('./utils');

/**
 * @desc create new logger node listener
 * @return {Promise<undefined>}
 */
const loggerProtocolFactory = () => new Promise((res, rej) => {

    createNewPeerInfo()
        .then((peerInfo) => {

            // add address
            peerInfo.multiaddrs.add('/ip4/'+require('ip').address()+'/tcp/0');

            const node = new Node({peerInfo: peerInfo});
            const p = Pushable();

            node.start((err) => {

                if (err){
                    return rej(err)
                }

                // Display address
                peerInfo.multiaddrs.forEach((addr) => {
                    qrcode.generate(addr.toString());
                    console.log(`----- Address: ${addr.toString()} -----`)
                });

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
        .catch(rej)

});

module.exports = {
    loggerProtocolFactory
};
