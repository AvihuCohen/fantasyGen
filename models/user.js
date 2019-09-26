var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var userSchema = new mongoose.Schema({
	username: String,
	password: String,
	email: { type: String, default: " " },
	gender: { type: String, default: " " },
	dateOfBirth: { type: String, default: " " },
	hasTeam: { type: Number, default: 0 },
	admin: { type: Number, default: 0 },
	team: {
		players: [String],
		formation: String,
		moneyLeft: { type: Number, default: 100}
	}
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);