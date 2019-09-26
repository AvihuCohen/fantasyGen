var express = require("express");
var router = express.Router();
var Player = require("../models/player");

// players statistics route
router.get("/", function(req, res){
	Player.find({}, function(err, allPlayers){
		if(err) {
			console.log(err);
			res.redirect("back");
		} else {
			allPlayers = allPlayers.sort((a, b) => (a.points > b.points) ? -1 : 1);
			res.render("playerStats", {players: allPlayers});
		}
	});

});

module.exports = router;
