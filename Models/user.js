
/**
 * Module dependencies.
 */
var mongoose    = require('mongoose');
var validate    = require('mongoose-validator').validate;
var bcrypt      = require('bcrypt');
var restify     = require('restify');
var Schema      = mongoose.Schema;
var ObjectId    = Schema.ObjectId;

/**
 * Vaidation Rules
 */
var nameValidator   = [validate('len', 3, 50), validate('isAlphanumeric')];
var userValidator   = [validate('len', 3, 25), validate('isAlphanumeric'), validate('notEmpty')];
var emailValidator  = [validate('isEmail')];
var passValidator   = [validate('len', 8, 50)];

/**
 * User Schema
 */
var UserSchema = new Schema({
    id:                 ObjectId,
    name:               { type: String, trim: true, required: true, validate: nameValidator },
    email:              { type: String, trim: true, required: true, validate: emailValidator },
    username:           { type: String, trim: true, required: true, validate: userValidator, lowercase: true },
    hashed_password:    { type: String, trim: true, required: true, validate: passValidator },
    newEmail:           { type: String, trim: true, default: '' },
    emailValidatedFlag: { type: Boolean, default: false },
    role:               { type: String, enum: ['User', 'Subscriber', 'Admin'], default: 'User' },
    tempPasswordFlag:   { type: Boolean, default: false }
})


/**
 * Virtuals
 */
UserSchema
    .virtual('password')
    .set(function(password) {
      this._password = password
      this.hashed_password = this.encryptPassword(password)
    })
    .get(function() { return this._password })

/**
 * Validations
 */
var validatePresenceOf = function (value) {
    return value && value.length
}

// tried these formats, always get the generic message
//UserSchema.path('name').validate(function (name) {
//  return validatePresenceOf(name)
//}, 'Name cannot be blank')

/**
 * Pre-save hook
 */
UserSchema.pre('save', function(next) {
  if (!validatePresenceOf(this.name)) {
    next(new restify.MissingParameterError('Name cannot be blank'));
  }
  if (!validatePresenceOf(this.username)) {
    next(new restify.MissingParameterError('Username cannot be blank'));
  }
  if (!validatePresenceOf(this.role)) {
    next(new restify.MissingParameterError('Role cannot be blank'));
  }
  if (!validatePresenceOf(this.email)) {
    next(new restify.MissingParameterError('Email cannot be blank'));
  }
  if (this.email.indexOf('@') <= 0) {
//    next(new restify.MissingParameterError('Email address must be valid'));
  }

  // password not blank when creating, otherwise skip
  if (!this.isNew) return next();
  if (!validatePresenceOf(this.password)) {
    next(new restify.MissingParameterError('Invalid password'));
  }
  next();
})

/**
 * Methods
 */

UserSchema.methods = {

  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} plainText
   * @return {Boolean}
   * @api public
   */
   authenticate: function(plainText) {
      return bcrypt.compareSync(plainText, this.hashed_password);
   },

  /**
   * Encrypt password
   *
   * @param {String} password
   * @return {String}
   * @api public
   */
   encryptPassword: function(password) {
      if (!password) return ''

      var salt = bcrypt.genSaltSync(10);
      var hash = bcrypt.hashSync(password, salt);

      return hash;
   },

  /**
   * allowAccess
   *
   * @param {String} role
   * @return {Boolean}
   * @api public
   */
   allowAccess: function(role) {
      if (this.role == 'Admin') return true; // Admin can access everything
      if (role == 'Subscriber' && this.role == 'Subscriber') return true; // Subscriber can access Subscriber and User
      if (role == 'User' && (this.role == 'User' || this.role == 'Subscriber')) return true; // user is at the bottom of special access
      return false; // should only happen if checking access for an anonymous user
   }
}

mongoose.model('User', UserSchema)
