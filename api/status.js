const { getStatus } = require('../lib/store');

module.exports = async (req, res) => {
  const status = await getStatus();
  res.status(200).json(status);
};
