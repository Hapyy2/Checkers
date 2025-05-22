// middleware/validation.js w Error Service
const validateError = (req, res, next) => {
  const error = req.body?.error;
  if (!error || !error.message) {
    return res.status(400).json({
      success: false,
      error: "Invalid error format. Must include error object with message.",
    });
  }
  next();
};

module.exports = validateError;
