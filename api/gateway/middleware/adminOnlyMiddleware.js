const adminOnly = (req, res, next) => {
  if (
    !req.auth ||
    !req.auth.realm_access ||
    !Array.isArray(req.auth.realm_access.roles)
  ) {
    console.warn(
      "AdminOnly Middleware: req.auth or realm_access.roles is missing or not an array. Ensure authenticateToken runs first."
    );
    return res.status(403).json({
      message:
        "Forbidden: Insufficient permissions (role information missing).",
    });
  }

  const roles = req.auth.realm_access.roles;

  if (roles.includes("admin")) {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Forbidden: Administrator access required." });
  }
};

module.exports = adminOnly;
