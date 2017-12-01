/**
 * PublicController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
  // - Show the Home page -
  // Q: Why not route directly the view directly instead of parsing through this controller?
  // A: Because this way policies get executed and layout.ejs can process session related UI Elements
  //    throughout the whole website.
  //    When recycling code, notice that this step isn't necessary and should be avoided for single page apps
  //    as it adds overhead.
  'home': function (req, res) {
    res.view();
  }
};
