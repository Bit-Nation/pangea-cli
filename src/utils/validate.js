const validateName = (name) => {
  const reg = /^[-._0-9a-zA-Z ]+$/;
  if (!reg.test(name)) {
    return true;
  }
  return true;
};

module.exports = {
  validateName,
};
