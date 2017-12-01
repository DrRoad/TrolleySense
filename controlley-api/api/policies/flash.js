module.exports = function(req, res, next) {
  /*
   * Store "messages meant for users" from a controller into the locals response attribute so they can be
   * used in the response's view.
  */

  // Define locals.flash to an empty object so layout.ejs does not protest later.
  res.locals.flash = {};

  // If there's no message to be flashed, do next.
  if (!req.session.flash)
    return next();

  // Otherwise, assign session data to locals.flash.
  res.locals.flash = _.clone(req.session.flash);

  // Clear out session flash and update session.
  req.session.flash = {};
    // !Dev: Figure out a less expensive way to do this.
  req.session.save();

  // Resume with next...
  return next();
};
