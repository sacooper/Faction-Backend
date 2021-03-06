// var User = {
module.exports = {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    username  : { 
    	type: 'string',
    	unique: true 
    },
    email     : { 
    	type: 'email',  
    	unique: true 
    },
    factionsSent  : {
    	collection: 'faction',
      via: 'sender'
    },
    factionsReceived : {
      collection: 'faction',
      via: 'recipients'
    },
    pendingFactions : {
      collection: 'pendingFaction',
      via: 'recipient'
    },
    newFriends : {
    	collection: 'acceptedFriendRequest',
      via: 'sender'
    },
    pendingSentRequests : { 
      collection: 'pendingFriendRequest',
      via: 'sender'
    },
    pendingReceivedRequests : {
    	collection: 'pendingFriendRequest',
      via: 'recipient'
    },
    friends : {
    	collection: 'user'
    },
    passports : { 
      collection: 'Passport', 
      via: 'user' 
    },
    lastUpdate : {
      type: 'datetime',
      defaultsTo: '2015-02-17T19:44:44.000Z'
    },
    deletedFactions: {
      collection: 'faction',
      via: 'deletedBy'
    },
    groups: {
      collection: 'group',
      via: 'creator',
    },
  },

  /**
   * Callback to be run before creating a User. Enforces uniqueness
   * of username and email.
   *
   * @param {Object}   user The soon-to-be-created User
   * @param {Function} next
   */
  beforeCreate: function (user, next) {
  	User.find()
  		.where({username: user.username})
  		.exec(function(err, users) {
  			// Check if username is unique
	  		if(users === undefined || users.length == 0) {
	  			User.find()
	  				.where({email: user.email})
	  				.exec(function(err, users) {
	  					// Check if email is unique
				  		if(users === undefined || users.length == 0) {
				  			next(null, user);
				  		} else {
				  			var err = {};
			  				err.invalidAttributes = {};
							err.code = 'E_VALIDATION';
							err.invalidAttributes.email = true;
				  			next(err);
				  		}
			  	});
	  		} else {
	  			var err = {};
  				err.invalidAttributes = {};
				err.code = 'E_VALIDATION';
				err.invalidAttributes.username = true;
	  			next(err);
	  		}
	  	});
  },

  findFriends: function(user, next, nextErr){
    User.findOne()
      .where({username: user.username})
      .populate('friends')
      .then(next)
      .catch(nextErr);
  },

  search: function(str, next, nextErr){
    User.find({
      or: [
        {email: {'contains': str}},
        {username: {'contains': str}}]})
        .then(next)
        .catch(nextErr);
  }
};

// module.exports = User;
