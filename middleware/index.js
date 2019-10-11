var Comment = require("../models/comment");

var middlewareObj = {};

//middleware
middlewareObj.isLoggedIn = function(req, res, next){
	if(req.isAuthenticated()) {
		return next();
	}
	req.flash("error", "You need to be logged in to do that.");
	res.redirect("/login");
}

middlewareObj.checkCommentOwnership = function(req, res, next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id, function(err, foundComment){
			if(err || !foundComment) {
				req.flash("error", "Comment not found.");
				res.redirect("back");
			} else {
				// user is logged in
				// check if he owns the comment
				if(foundComment.author.id.equals(req.user._id)) {
					next();
				} else {
					req.flash("error", "You dont have permission to do that.");
					res.redirect("back");
				}
			}
		});
	} else {
		req.flash("error", "You need to be logged in to do that.");
		res.redirect("back");
	}
}

middlewareObj.userHasTeam = function(req, res, next){
	if(req.user.hasTeam){
		next();
	} else {
		res.redirect("back");
	}
}

middlewareObj.isAdmin = function(req, res, next){
	if(req.user.admin === 1){
		next();
	} else {
		res.redirect("back");
	}
}

// ----------------------------------------------------
// Team functions

middlewareObj.getChosenPlayers = function(playerIDs, allPlayers) {
	var chosenPlayers = [];
	// console.log("PLAYER ID:",playerIDs.length);
	for (let i = 0; i < playerIDs.length; i++) {
		if (playerIDs[i] !== "0") {
			// console.log("=====");
			chosenPlayers.push(allPlayers.find(function (player) {
				return (player._id == playerIDs[i]);
			}));
		}
	}

	// console.log("cohsen:", chosenPlayers.length);

	return chosenPlayers;
}

middlewareObj.checkExceededBudget = function(chosenPlayers) {

	// TODO FIX MATH.ROUND MONEYLEFT
	var budgetExceeded = {
		exceeded: false,
		moneyLeft: 0
	};
	var pricesSum = 0;

	chosenPlayers.forEach((player) => {
		pricesSum += player.price;
	});

	if (pricesSum > 100) {
		budgetExceeded.exceeded = true;

	}
	budgetExceeded.moneyLeft = (100 - pricesSum);

	console.log("moneyleft:",budgetExceeded.moneyLeft);

	return budgetExceeded;
}

middlewareObj.checkMoreThanThreeFromSameTeam = function(chosenPlayers) {
	var moreThanThreeFromSameTeam = false;
	var teamsBucket = [];

	chosenPlayers.forEach((player) => {

		if (!teamsBucket[player.team]) {
			teamsBucket[player.team] = 1;
		} else {
			teamsBucket[player.team]++;

			if (teamsBucket[player.team] > 3) {
				moreThanThreeFromSameTeam = true;
			}
		}
	});

	return moreThanThreeFromSameTeam;
}

middlewareObj.checkPlayerDuplications = function(playerIDs) {

	var validPlayerIds = [];

	playerIDs.forEach((id) => {
		if (id != "0") {
			validPlayerIds.push(id);
		}
	});

	let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index)

	var duplicates = findDuplicates(validPlayerIds);
	// All duplicates
	if (duplicates.length > 0) {
		return true;
	} else {
		return false;
	}
}

middlewareObj.checkFullteam = function(playerIDs) {
	var fullteam = true;
	playerIDs.forEach((id) => {
		if (id === "0") {
			fullteam = false;
		}
	});
	return fullteam;
}

middlewareObj.getValidationResults = function(fullteam, duplicatePlayers, moreThanThreeFromSameTeam, exceededBudget) {
	var isValid = fullteam && !duplicatePlayers && !moreThanThreeFromSameTeam && !exceededBudget.exceeded;


	var res = {
		valid: isValid,
		err: {
			fullteam: fullteam,
			playerDuplicate: duplicatePlayers,
			moreThanThree: moreThanThreeFromSameTeam,
			exceededBudget: {
				exceeded: exceededBudget.exceeded,
				moneyLeft: exceededBudget.moneyLeft
			}

		}
	};

	return res;
}

middlewareObj.validateTeamAndGetResults = function(playerIDs, allPlayers) {
	var chosenPlayers = middlewareObj.getChosenPlayers(playerIDs, allPlayers);
	var fullteam = middlewareObj.checkFullteam(playerIDs);
	var duplicatePlayers = middlewareObj.checkPlayerDuplications(playerIDs);
	var moreThanThreeFromSameTeam = middlewareObj.checkMoreThanThreeFromSameTeam(chosenPlayers);
	var exceededBudget = middlewareObj.checkExceededBudget(chosenPlayers);
	var res = middlewareObj.getValidationResults(fullteam, duplicatePlayers, moreThanThreeFromSameTeam, exceededBudget);

	return res;
}

module.exports = middlewareObj;