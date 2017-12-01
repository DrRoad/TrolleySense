/**
 * UserController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
  // GET /signup
  'signup': function (req, res) {
    res.view();
  },
  // POST User/Create
  create: function (req, res, next) {
    // Create user with parameters sent from the sign-up forms.
    User.create( req.body, function userCreated (err, user) {
      console.log("Creating user: ");
      // If there's an error, flash it in the view.
      if (err) {
        req.session.flash = {
          err: err
        };
        // Go back to the sign-up  page.
        res.redirect('/signup');
      } else {
        // After successfully created, go to administration panel.
        console.log("User successfully created");
        // DEV: go to admin panel (to be created)
        res.redirect('/');
      }
    });
  }
};
