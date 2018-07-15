const tweetnacl = require('tweetnacl');
const { encryptValue, isInvalidValidPassword, decryptValue } = require('./utils');
const fs = require('fs');

const SIGNING_KEY_VERSION = 1;

/**
 * @desc Create a new signing key pair and persist it
 * @param {string} pw password that should be used to encrypt the singing key
 * @param {string} pwConfirmation confirmation of the entered password
 * @param {string} skName name of the signing key (e.g. "Send Money Production")
 */
const newSigningKey = ({pw, pwConfirmation, skName}) => new Promise((res, rej) => {

    // password validation
    if (pw !== pwConfirmation) {
        return rej(new Error(`password and password confirmation have to match`))
    }
    if (isInvalidValidPassword(pw)) {
        return rej(isInvalidValidPassword(pw))
    }

    // the singing key pair
    const ed25519KeyPair = tweetnacl.sign.keyPair();

    // unit timestamp
    const unixNow = Math.floor(new Date() / 1000);

    // the file name
    const skFileName = `${skName}-${unixNow}.sk.json`;

    encryptValue(Buffer.from(ed25519KeyPair.secretKey).toString('hex'), pw)
        .then((encryptedSigningKey) => {

            // signing key file
            const signingKeyContent = {
                name: skName,
                public_key: Buffer.from(ed25519KeyPair.publicKey).toString('hex'),
                private_key_cipher_text: encryptedSigningKey,
                created_at: unixNow,
                version: SIGNING_KEY_VERSION,
            };

            fs.writeFile(skFileName, JSON.stringify(signingKeyContent, null, 2), (err) => {
                if(err) {
                   return rej(err)
                }
                res(`Persisted your signing key (${skFileName})`)
            });


        })
        .catch(rej)

});

/**
 * @desc Change password of singing key
 * @param oldPassword
 * @param newPw
 * @param newPwConfirmation
 * @param signingKeyFile
 * @return {Promise<Promise>}
 */
const signingKeyChangePW = ({oldPassword, newPw, newPwConfirmation}, signingKeyFile) => new Promise((res, rej) => {

    // make sure singing key exist
    if (!fs.existsSync(signingKeyFile)){
        return rej(new Error(`Signing key ("${signingKeyFile}") does not exist`))
    }

    // make sure password is valid
    if (isInvalidValidPassword(newPw)){
        return rej(isInvalidValidPassword(newPw))
    }

    // make sure that the new passwords match
    if (newPw !== newPwConfirmation){
        return rej(new Error(`password and password confirmation have to match`))
    }

    // read signing key
    const rawSigningKey = fs.readFileSync(signingKeyFile, 'utf8');
    const signingKey = JSON.parse(rawSigningKey);

    // unit timestamp
    const unixNow = Math.floor(new Date() / 1000);

    // first decrypt the old signing key
    decryptValue(signingKey.private_key_cipher_text, oldPassword)

        // after decrypting (decrypting will fail when the password is invalid) we encrypt with the new password
        .then((singingPrivateKey) => encryptValue(singingPrivateKey.toString(), newPw))

        // persist encrypted singing key
        .then((encryptedSigningKey) => {

            signingKey.private_key_cipher_text = encryptedSigningKey;
            signingKey.created_at = unixNow;

            const skFileName = `${signingKey.name}-${unixNow}.sk.json`;

            fs.writeFile(skFileName, JSON.stringify(signingKey, null, 2), (err) => {
                if (err){
                    return rej(err)
                }
                res(`Persisted your signing key (${skFileName})`)
            })

        })
        .catch(rej)

});

module.exports = {
    newSigningKey,
    signingKeyChangePW
};