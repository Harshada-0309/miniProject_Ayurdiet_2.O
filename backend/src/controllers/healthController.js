/**
 * Health Controller
 * Provides system liveness and basic service status
 */

const getHealth = (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'ayurdiet-backend',
  });
};

module.exports = {
  getHealth,
};
