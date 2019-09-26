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

module.exports = middlewareObj;