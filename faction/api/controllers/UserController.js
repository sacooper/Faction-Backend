/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {


	/********************* USER FLOW RELATED ACTIONS *********************/


	getAllInfo: function(req, res) {
		var userId = req.user.id;

		User.findOne()
			.where({id: req.user.id})
			.populate("friends")
			.populate("pendingReceivedRequests")
			.populate("newFriends")
			.populate("factionsReceived")
			.populate("factionsSent")
			.populate("pendingFactions")
			.then(function(me) {
				var lastUpdate = me.lastUpdate || new Date(2000,1,1,0,0,0,0);

				var updateTimestamp = new Date();

				// Ids of pending friend request users
				var pendingReceivedRequestsIds = me.pendingReceivedRequests.map(function(f) {return f.recipient; });

				// Ids of the new friends recently made
				var newFriendsIds = me.newFriends.map(function(f){ return f.newFriend; });

				// Ids of the factions Received
				var factionReceivedIds = me.factionsReceived.map(function(f){ return f.id; });
			
				// Ids of the factions Sent
				var factionSentIds = me.factionsSent.map(function(f){ return f.id; });
				
				// Ids of the pending factions
				var factionIds = me.pendingFactions.map(function(f){ return f.faction; });

				// Array of friends
				var friends = me.friends;


				var pendingUsers = User.find({
						id: pendingReceivedRequestsIds,
						createdAt: { '>=': lastUpdate}
					}).then(function(pendingFriend) {
						return pendingFriend;
					});

				var newFriends = User.find({
						id: newFriendsIds,
						createdAt: { '>': lastUpdate}
					}).then(function(newFriends) {
						return newFriends;
					});

				var factionsReceived = Faction.find({
						id: factionReceivedIds
					})
					.populate('sender')
					.then(function(factionsReceived) {
						return factionsReceived;
					});

				var factionsSent = Faction.find({
						id: factionSentIds
					})
					.populate('sender')
					.then(function(factionsSent) {
						return factionsSent;
					});

				var pendingFactions = Faction.find({
						id: factionIds,
						createdAt: { '>': lastUpdate}
					})
					.populate('sender')
					.then(function(pendingFactions) {
						return pendingFactions;
					});

				// TODO: INCLUDE createdAt criteria
				var responses = [];


				return [friends, pendingUsers, newFriends, 
							factionsReceived, factionsSent, pendingFactions,
							responses, updateTimestamp];

			})
			.spread(function(friends, pendingUsers, newFriends, 
								factionsReceived, factionsSent, pendingFactions,
								responses, updateTimestamp) {

				res.status(200).send({
					friends : _.pluck(friends, 'username'),
					receivedFriendRequests: _.pluck(pendingUsers, 'username'),
					acceptedFriendRequests: _.pluck(newFriends, 'username'),
					factionsReceived: factionsReceived.map(function(f){
						return {
							sender : _.find(friends, function(friend){return friend.id == f.sender.id; }).username,
							factionId: f.id,
							fact : f.fact,
							story : f.story }}),
					factionsSent: factionsSent.map(function(f){
						return {
							recipients : f.recipients.map(function(r){ return _.find(friends, function(friend){ return friend.id == r.id; }).username;}),
							factionId: f.id,
							fact : f.fact,
							story : f.story }}),
					pendingFactions: pendingFactions.map(function(f){
						return {
							sender : _.find(friends, function(friend){return friend.id == f.sender.id; }).username,
							factionId: f.id,
							fact : f.fact,
							story : f.story }}),
					factionResponses: responses,
					updateTimestamp: updateTimestamp
				});
			})
			.catch(function(err)
{				res.status(500).send(Message.createError(err));
			});
	},

	update: function(req, res){
		var userId = req.user.id;

		var lastSuccessulUpdate = req.param('updateTimestamp');
		if (!lastSuccessulUpdate){
			return res.status(400).send(Message.createError("No timestamp of last update sent"));
		}

		if (req.param('viewedFactions')){
			var viewedFactions = req.param('viewedFactions');
		}
		else {
			return res.status(400).send(Message.createError("No array sent for viewedFactions"));
		}

		var lastUpdate;

		User.findOne()
			.where({id: req.user.id})
			.populate('friends')
			.populate("pendingReceivedRequests")
			.populate("newFriends")
			.populate("pendingFactions")
			.then(function(me) {
				var lastUpdate = me.lastUpdate || new Date(2000,1,1,0,0,0,0);

				// Ids of pending friend request users
				var pendingReceivedRequestsIds = me.pendingReceivedRequests.map(function(f) {return f.recipient; });

				// Ids of the new friends recently made
				var newFriendsIds = me.newFriends.map(function(f){ return f.newFriend; });

				// Ids of the pending factions
				var factionIds = me.pendingFactions.map(function(f){ return f.faction; });

				var pendingUsers = User.find({
						id: pendingReceivedRequestsIds,
						createdAt: { '>': lastUpdate}
					}).then(function(pendingFriend) {
						return pendingFriend;
					});

				var newFriends = User.find({
						id: newFriendsIds,
						createdAt: { '>': lastUpdate}
					}).then(function(newFriends) {
						return newFriends;
					});

				var pendingFactions = Faction.find({
						id: factionIds,
						createdAt: { '>': lastUpdate}
					})
					.populate('sender')
					.then(function(pendingFactions) {
						return pendingFactions;
					});

				var updatedUser = User.update({id : userId}, {lastUpdate: lastSuccessulUpdate});
				var updatedPendingFactions = PendingFaction.update({faction: viewedFactions}, {read:true});


				// TODO: INCLUDE createdAt criteria
				var responses = [];

				var updateTimestamp = new Date();

				return [me.friends, pendingUsers, newFriends, pendingFactions, responses, updateTimestamp, updatedUser, updatedPendingFactions];

			})
			.spread(function(friends, pendingUsers, newFriends, pendingFactions,
								responses, updateTimestamp, updatedUser, updatedPendingFactions) {
				res.status(200).send({
					receivedFriendRequests: _.pluck(pendingUsers, 'username'),
					acceptedFriendRequests: _.pluck(newFriends, 'username'),
					pendingFactions: pendingFactions.map(function(f){
						return {
							sender : _.find(friends, function(friend){return friend.id == f.sender.id; }).username,
							factionId: f.id,
							fact : f.fact,
							story : f.story }}),
					factionResponses: responses,
					updateTimestamp: updateTimestamp
				});
			}).catch(function(err){
				res.status(500).send(Message.createError(err));
			});
	},
	
	/********************* FRIEND RELATED ACTIONS *********************/

	addFriend: function(req, res) {

		var friendUsername = req.param('username');
		var myId = req.user.id;

		var errFct = function(err) {
			return res.status(500).send(Message.createError(err));
		};

		var reverseRequest = function(me, friend) {

			// Remove pending requests
			PendingFriendRequest.destroy({
				sender: friend.id,
				recipient: me.id
			})
			.then(function(pfr) {
				// Put into friend's list
				me.friends.add(friend.id);
				friend.friends.add(me.id);

				// Save changes to database
				friend.save()
				.then(function(user){
					me.save()
					.then(function(user) {
						AcceptedFriendRequest.create({
							sender: friend.id,
							newFriend: me.id
						})
						.then(function(fReq) {
							res.status(200).send(Message.createSuccess(friend.username + ' already added you, therefore you are now friends'), {});

						})
						.catch(errFct);;
					})
					.catch(errFct);
				})
				.catch(errFct);
			})
			.catch(errFct);
		};

		User.findOne()
			.where({username: friendUsername})
			.populate('pendingReceivedRequests')
			.populate('pendingSentRequests')
			.populate('friends')
			.populate('newFriends')
			.then(function(friend) {

				if(friend) {
					// Get all friend information and spread it

					var friendReceivedFromUsers = User.find({
						id: _.pluck(friend.pendingReceivedRequests, 'sender')
					})
					.then(_.identity)
					.catch(errFct);

					var friendSentToUsers = User.find({
						id: _.pluck(friend.pendingSentRequests, 'recipient')
					})
					.then(_.identity)
					.catch(errFct);

					return [friend, friendReceivedFromUsers, friendSentToUsers];
				} else {
					// TODO: fix, should not spread further.
					res.status(400).send(Message.createError("Username of friend is invalid"));
				}

			})
			.spread(function(friend, friendReceivedFromUsers, friendSentToUsers) {
			User.findOne()
				.where({id: myId})
				.populate('pendingReceivedRequests')
				.populate('pendingSentRequests')
				.populate('friends')
				.populate('newFriends')
				.then(function(me) {

					var meReceivedFromUsers = User.find({
						id: _.pluck(me.pendingReceivedRequests, 'sender')
					})
					.then(_.identity)
					.catch(errFct);

					var meSentToUsers = User.find({
						id: _.pluck(me.pendingSentRequests, 'recipient')
					})
					.then(_.identity)
					.catch(errFct);

					return [friend, friendReceivedFromUsers, friendSentToUsers,
							me, meReceivedFromUsers, meSentToUsers];

				})
				.spread(function(friend, friendReceivedFromUsers, friendSentToUsers,
							me, meReceivedFromUsers, meSentToUsers) {

					if(me.id === friend.id) {
						res.status(400).send(Message.createError('You cannot add yourself.'));
					} else {
						
						// Already did a friend request
						if(_.some(friendReceivedFromUsers, function(f){return f.id === me.id;})
							&& _.some(meSentToUsers, function(f){return f.id === friend.id;})) {
							res.status(400).send(Message.createError('Friend request already posted'));
						} 
						
						// Check if both users are already friends
						else if(_.some(friend.friends, function(f){return f.id === me.id;}) 
							&& _.some(me.friends, function(f){return f.id === friend.id;})) {
							res.status(200).send(Message.createSuccess('You are already friends with ' + friend.username + '!'), {});
						}

						//Check if a friend request already happened before from the friend
						else if(_.some(friendSentToUsers, function(f){return f.id === me.id;})) {
							reverseRequest(me, friend);
						}

						// Otherwise create the friend request
						else {
							PendingFriendRequest.create({
								recipient: friend.id,
								sender: myId
							})
							.then(function(pReq) {
								res.status(201).send(Message.createSuccess("Successfully posted a friend request"), {});
							})
							.catch(errFct);;
						}
					}
				}).catch(errFct);
			}).catch(errFct);
	},

	acceptFriendRequest: function(req, res) {

		var friendUsername = req.param('username');
		var accepted = req.param('accepted');
		var myId = req.user.id;

		var errFct = function(err) {
			return res.status(500).send(Message.createError(err));
		};

		User.findOne()
		.where({username: friendUsername})
		.populate('friends')
		.then(function(friend) {

			if(!friend) {
				res.status(400).send(Message.createError('Username provided is invalid'));
			} 
			else {
				User.findOne()
				.where({id: myId})
				.populate('friends')
				.then(function(me) {

					// Check if user tried adding himself
					if(me.id === friend.id) {
						res.status(400).send(Message.createError('You cannot add yourself.'));
					}

					// Check if you are already friends with the user
					else if(_.some(me.friends, function(f){return f.id === friend.id})
						&& _.some(friend.friends, function(f){return f.id === me.id})) {
						res.status(200).send(Message.createSuccess('You are already friends with ' + friend.username, {}));
					}

					// Otherwise proceed and add him to friends
					else {

						PendingFriendRequest.destroy({
							sender: friend.id,
							recipient: me.id
						})
						.then(function(pfr) {
							if(accepted === "true") {

								me.friends.add(friend.id);

								friend.friends.add(myId);

								me.save()
								.then(function(user) {
									friend.save()
									.then(function(user) {
										AcceptedFriendRequest.create({
											sender: friend.id,
											newFriend: me.id
										})
										.then(function(fReq) {
											res.status(200).send(Message.createSuccess('Successfully added ' + friend.username + ' to your friends!', {}));	
										})
										.catch(errFct);
									})
									.catch(errFct);
								})
								.catch(errFct);
							} else {
								me.save()
								.then(function(user) {
									friend.save()
									.then(function(user) {
										res.status(200).send(Message.createSuccess('Successfully removed friend request from ' + friend.username, {}));	
									})
									.catch(errFct);
								})
								.catch(errFct);
							}
						})
						.catch(errFct);
					}
				})
				.catch(errFct);
			}
		})

		.catch(errFct);
	},

	deleteFriend: function(req, res) {
		var friendUsername = req.param('username');

		var errFct = function(err) {
			return res.status(500).send(Message.createError(err));
		};

		User.findOne({
			id: req.user.id
		})
		.populate('friends')
		.then(function(me){
			User.findOne({
				username: friendUsername
			})
			.populate('friends')
			.then(function(friend) {

				if(me.id === friend.id){
					res.status(400).send(
						Message.createError("You are trying to remove yourself...")
					);
				}
				else if(_.some(me.friends, function(f){return f.id === friend.id;})
					|| _.some(friend.friends, function(f){return f.id === me.id;}))
				{
					me.friends.remove(friend.id);
					friend.friends.remove(me.id);
					
					me.save()
						.then(function(me){
						friend.save()
						.then(function(friend){

							// Destroy newFriend if wasn't destroyed in a previous update.
							// Will succeed even if it doesn't find anything to destroy, 
							// calls errFct iff internal server error
							AcceptedFriendRequest.destroy({
								sender: [me.id, friend.id],
								newFriend: [me.id, friend.id]
							})
							.then(function(afr) {
								res.status(200).send(
									Message.createSuccess("Successfully removed " + friend.username + " from your friend's list.", {})
								);
							})
							.catch(errFct);
						})
						.catch(errFct);
					})
					.catch(errFct);
				}
				else {
					res.status(200).send(Message.createSuccess("You are already not friends with " + friend.username, {}));
				}

			})
			.catch(errFct);
		})
		.catch(errFct);
	},

	/******************** UTILITY RELATED ACTIONS ********************/

	factions: function(req, res) {
		var userId = req.user.id;

		User.findOne()
		.where({id: req.user.id})
		.populate("factionsReceived")
		.populate("factionsSent")
		.then(function(me) {

			var senderIds = _.pluck(me.factionsReceived, 'sender');

			User.find({id: senderIds})
			.then(function(users){
				// TODO: fix this O(n^2) loop
				users.forEach(function(user) {
					me.factionsReceived.forEach(function(faction) {
						if(user.id === faction.sender) {
							faction.sender = user.username;
						}
					})
				});
	
				var sent = me.factionsSent.map(function(faction) {
					return {
						sender: faction.sender,
						story: faction.story,
						fact: faction.fact,
						id: faction.id
					}
				});

				var received = me.factionsReceived.map(function(faction) {
					return {
						sender: faction.sender,
						story: faction.story,
						fact: faction.fact,
						id: faction.id
					}
				});

				res.status(200).send(
					Message.createSuccess(
						'Successfully fetched factions', 
						{ sent: sent, received: received }
					)
				);
			})
			.catch(function(err) {
				res.status(500).send(Message.createError(err));
			})
		})
		.catch(function(err){
			res.status(500).send(Message.createError(err));
		});
	},

	friends: function(req, res){
		var next = function(user){
			var friends = _.pluck(user.friends, 'username');
			res.status(200).send(
				Message.createSuccess(
					'Successfully fetched friends',
					friends
				)
			);
		}

		var nextErr = function(err) {
			res.status(500).send(Message.createError(err));
		}

		User.findFriends(req.user, next, nextErr);
	},

	search: function(req, res){
		var str = req.param('search') || "";

		var next = function(users){
			res.status(200).send(
				Message.createSuccess(
					"Search successful", 
					_.pluck(users, 'username')
				)
			);
		};

		var nextErr = function(err) {
			res.status(500).send(Message.createError(err));
		}

		User.search(str, next, nextErr);
	}

};

