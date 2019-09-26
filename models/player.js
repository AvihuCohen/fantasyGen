var mongoose = require("mongoose");

var playerSchema = new mongoose.Schema({
	name: String,
	team: String,
	position: String,
	price: Number,
	points: Number,
	imageURL: String

});

 module.exports = mongoose.model("Player", playerSchema);