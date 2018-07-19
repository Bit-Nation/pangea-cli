const newSigningKeySchema = [
    {
        type: 'input',
        name: 'skName',
        message: 'Enter signing key name ...',
    },
    {
        type: 'password',
        name: 'pw',
        message: 'Enter password ...',
    },
    {
        type: 'password',
        name: 'pwConfirmation',
        message: 'Confirm password ...',
    },
];

const changePasswordSigningKeySchema = [
    {
        type: 'password',
        name: 'oldPassword',
        message: 'Enter old password ...',
    },
    {
        type: 'password',
        name: 'newPw',
        message: 'Enter new password ...',
    },
    {
        type: 'password',
        name: 'newPwConfirmation',
        message: 'Confirm new password ...',
    },
];

const dappStreamingSchema = [
    {
        type: 'password',
        name: 'pw',
        message: 'Enter password ...',
    },
];

module.exports = {
    newSigningKeySchema,
    changePasswordSigningKeySchema,
    dappStreamingSchema,
};
