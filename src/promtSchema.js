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

const buildBundleFileSchema = [
    {
        type: 'password',
        name: 'pw',
        message: 'Verify password of signing key ...',
    },
];

module.exports = {
    newSigningKeySchema,
    changePasswordSigningKeySchema,
    buildBundleFileSchema,
};
