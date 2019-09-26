var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Player = require("../models/player");
var Article = require("../models/article");
var Comment = require("../models/comment");
var middleware = require("../middleware");

// root route
router.get("/", function (req, res) {
    Player.find({}, function (err, topPlayers) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            Article.find({}, function (err, articles) {
                if (err) {
                    req.flash("error", err.message);
                    res.redirect("back");
                } else {
                    res.render("landing", {topPlayers: topPlayers, articles: articles});
                }
            });
        }
    }).limit(5);
});


// show register form
router.get("/register", function (req, res) {
    res.render("register");
});

// signup logic
router.post("/register", function (req, res) {
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            req.flash("error", err.message);
            res.redirect("/register");
        }


        user.email = req.body.email;
        user.gender = req.body.gender;

        if (req.body.day && req.body.month && req.body.year) {
            user.dateOfBirth = req.body.day + "/" + req.body.month + "/" + req.body.year;
        }

        user.save();

        passport.authenticate("local")(req, res, function () {
            req.flash("success", "Welcome to FantasyGen " + user.username + ".");
            res.redirect("/");
        });

    });

});

// show log-in form
router.get("/login", function (req, res) {
    res.render("login");
})

// login logic (with *middleware*)
router.post("/login", passport.authenticate("local",
    {
        successRedirect: "/",
        failureRedirect: "/login"
    }), function (req, res) {
});

// logout route
router.get("/logout", middleware.isLoggedIn, function (req, res) {
    req.logout();
    req.flash("success", "You have been logged out.");
    res.redirect("back");
});

// PROFILE

router.get("/profile", middleware.isLoggedIn, function (req, res) {
    res.render("profile");
});

router.get("/profile/edit", middleware.isLoggedIn, function (req, res) {
    res.render("editProfile");
});

router.post("/profile/edit", middleware.isLoggedIn, function (req, res) {
    res.locals.currentUser.username = req.body.username;
    res.locals.currentUser.email = req.body.email;

    if (req.body.day && req.body.month && req.body.year) {
        res.locals.currentUser.dateOfBirth = req.body.day + "/" + req.body.month + "/" + req.body.year;
    }

    res.locals.currentUser.save();

    res.redirect("/profile");
});

// ADMIN

router.get("/admin", middleware.isLoggedIn, middleware.isAdmin, function (req, res) {
    User.find({}, function (err, users) {
        Article.find({}, function (err, articles) {
            res.render("admin_panel", {users: users, articles: articles});

        });
    });
});

router.delete("/users", middleware.isLoggedIn, middleware.isAdmin, function (req, res) {
    var userID = req.body.userID;
    User.findByIdAndRemove(userID, function (err) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            res.redirect("/admin");
        }
    });
});

//      // ARTICLES

router.get("/articles/new", middleware.isLoggedIn, middleware.isAdmin, function (req, res) {
    res.render("newArticle");
});

router.get("/articles/:id", function (req, res) {
    Article.findById(req.params.id).populate("comments").exec(function (err, article) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            res.render("showArticles", {article: article});
        }
    });
});

router.get("/articles/edit/:id", function (req, res) {
    Article.findById(req.params.id, function (err, article) {
        res.render("editArticles", {article: article});
    });
});

router.post("/articles/edit/:id", function (req, res) {
    Article.findById(req.params.id, function (err, article) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            req.body.content = req.sanitize(req.body.content);
            article.title = req.body.title;
            article.content = req.body.content;
            article.image = req.body.imageURL;

            article.save();

            res.redirect("/admin");
        }
    });

});

router.post("/articles/new", middleware.isLoggedIn, middleware.isAdmin, function (req, res) {
    req.body.content = req.sanitize(req.body.content);
    var author = {
        id: req.user._id,
        username: req.user.username
    }

    var article = {
        title: req.body.title,
        content: req.body.content,
        image: req.body.imageURL,
        author: author
    };

    Article.create(article, function (err, newArticle) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            res.redirect("/admin");
        }
    });
});

router.delete("/articles", middleware.isLoggedIn, middleware.isAdmin, function (req, res) {
    var articleID = req.body.articleID;
    Article.findByIdAndRemove(articleID, function (err) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            res.redirect("/admin");
        }
    });
});

router.get("/articles/:id/comments/new", middleware.isLoggedIn, function (req, res) {
    res.render("newComment", {articleID: req.params.id});
});

router.post("/articles/:id/comments", middleware.isLoggedIn, function (req, res) {
    Article.findById(req.params.id, function (err, article) {
        if (err) {
            req.flash("error", "Something went wrong.");
            res.redirect("back");
        } else {
            Comment.create(req.body.comment, function (err, comment) {
                if (err) {
                    req.flash("error", "Something went wrong.");
                    res.redirect("back");
                } else {
                    // add username and id to comment
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    // save comment
                    comment.save();

                    article.comments.push(comment);
                    article.save();

                    req.flash("success", "Successfully added comment.")
                    res.redirect("/articles/" + article._id);
                }
            })
        }
    })
});

router.get("/articles/:id/comments/:comment_id/edit", middleware.isLoggedIn, function (req, res) {
    Comment.findById(req.params.comment_id, function(err, foundComment){
        if(err) {
            req.flash("error", "Something went wrong.");
            res.redirect("back");
        } else {
            res.render("editComment", {articleID: req.params.id, comment: foundComment});
        }
    });
});

router.put("/articles/:id/comments/:comment_id", middleware.checkCommentOwnership, middleware.isLoggedIn, function (req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
        if(err){
            res.redirect("back");
        } else{
            res.redirect("/articles/" + req.params.id);
        }
    });
});

router.delete("/articles/:id/comments/:comment_id", middleware.checkCommentOwnership, function(req, res){
    //find by id and remove
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
        if(err){
            res.redirect("back");
        } else{
            req.flash("success", "Comment deleted.");
            res.redirect("back");
        }
    });
});


module.exports = router;
