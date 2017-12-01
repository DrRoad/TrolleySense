/**
 * User.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  schema: true,

    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

  attributes: {
    email: {
      type: 'string',
      required: true,
      unique: true,
      isEmail: true,
      minLength: 6,
      maxLength: 30
    },
    password: {
      type: 'string',
      required: true,
      encrypt: true,
      minLength: 8,
      maxLength: 128
    },
    first_name: {
      type: 'string',
      required: true,
      unique: true,
      minLength: 3,
      maxLength: 120
    },
    last_names: {
      type: 'string',
      required: true,
      unique: true,
      minLength: 3,
      maxLength: 120
    },
    privilege: {
      type: 'number',
      defaultsTo: 0,
      max: 2
    }

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝


    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

  }

};

