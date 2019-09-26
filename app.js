var express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    methodOverride = require("method-override"),
    flash = require("connect-flash"),
    puppeteer = require('puppeteer'),
    schedule = require('node-schedule'),
    expressSanitizer = require("express-sanitizer"),
    middleware = require("./middleware"),


// AUTH
    passport = require("passport"),
    localStrategy = require("passport-local"),

// DB Models
    User = require("./models/user"),
    Comment = require("./models/comment"),
    Article = require("./models/article"),
    Player = require("./models/player");

//	seedDB = require("./seeds");

// requiring routes
var indexRoute = require("./routes/index"),
    playersRoute = require("./routes/players"),
    teamRoute = require("./routes/team");

var currentUser;
// {useNewUrlParser: true, useFindAndModify: false}
mongoose.connect("mongodb+srv://fantasyGen:a123456@cluster0-hhidd.mongodb.net/fantasy_db?retryWrites=true&w=majority");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"))
app.use(methodOverride("_method"));
app.use(flash());
app.use(expressSanitizer());

// Passport configuration

app.use(require("express-session")({
    secret: "Secret page",
    resave: false,
    saveUninitialized: false
}));


app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");


    next();
});

// using routes
app.use("/", indexRoute);
app.use("/players", playersRoute);
app.use("/team", teamRoute);

var server = app.listen(process.env.PORT, process.env.IP, function () {
    console.log("Server is running.");
});

var updateTime = "2,*";

var dbUpdate = schedule.scheduleJob('* 2 * * *', function () {
    console.log("Updating DATABASE(Init)");
    updateDB();
});

app.put("/updateDatabase", middleware.isLoggedIn, middleware.isAdmin, function (req, res) {
    var day = req.body.dayPicker;
    var hour = req.body.hourPicker;

    updateTime = hour + "," + day;
    var scheduleString = "* " + hour + " * * " + day;
    // console.log(scheduleString, " ---------------------------------------------- ");

    dbUpdate.cancel();

    dbUpdate = schedule.scheduleJob(scheduleString, function () {
        console.log("Updating DATABASE(Admin panel)");
        updateDB();
    });

    res.redirect("/admin");
});


async function getPlayersByIDs() {
    return await Player.find({}, {});
}

function seedDB() {
    // Add admin

    // User.findOne({username: "a"}, function (err, user) {
    //     user.admin = 1;
    //     user.save();
    // });


}

// tests


updateDB();

seedDB();

////// Global Functions

function updateDB() {
    console.log("1. In update DB");
    (async () => {
        const url = 'https://fantasy.premierleague.com/statistics';
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(url);

        for (var i = 0; i < 18; i++) {
            let playerButton = await page.$$(".ElementDialogButton__StyledElementDialogButton-sc-1vrzlgb-0");
            for (var j = 0; j < playerButton.length; j++) {
                await playerButton[j].click();
                await delay();

                let fullNameElement = await page.$(".ElementDialog__ElementHeading-gmefnd-2");
                await delay();

                let fullName = await page.evaluate(fullNameElement => fullNameElement.textContent, fullNameElement);
                // await console.log("Full name: " + fullName);

                let teamElement = await page.$(".ElementDialog__Club-gmefnd-4");
                await delay();

                let team = await page.evaluate(teamElement => teamElement.textContent, teamElement);
                let positionElement = await page.$(".ElementDialog__ElementTypeLabel-gmefnd-3");
                await delay();

                let position = await page.evaluate(positionElement => positionElement.textContent, positionElement);
                let pointsElement = (await page.$$(".ElementDialog__StatValue-gmefnd-9"))[2];
                await delay();

                let points = await page.evaluate(pointsElement => pointsElement.textContent, pointsElement);
                let fixedPoints = points.split("pts");
                points = fixedPoints[0];
                points = Number(points);

                let priceElement = (await page.$$(".ElementDialog__StatValue-gmefnd-9"))[3];
                await delay();

                let price = await page.evaluate(priceElement => priceElement.textContent, priceElement);
                let fixedPrice = price.split('£');
                price = fixedPrice[1];
                price = Number(price);

                let imageURL = await page.$$eval('img.ElementDialog__Img-gmefnd-5[src]', imageURL => imageURL.map(img => img.getAttribute('src')));
                await delay();

                imageURL = await "HTTP:" + imageURL;

                var newPlayer = {
                    name: fullName,
                    team: team,
                    position: position,
                    price: price,
                    points: points,
                    imageURL: imageURL
                };

                Player.create(newPlayer, function (err, newPlayer) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Success!");
                    }
                });
                // await Player.findOneAndUpdate({name: fullName}, {
                //     price: newPlayer.price,
                //     points: newPlayer.points
                // }, function (err, player) {
                //     if (err) {
                //         console.log(err);
                //     } else {
                //         // player = newPlayer;
                //         // console.log(player);
                //         // player.save();
                //     }
                // });
                // Player.findOneAndUpdate({name: fullName}, newPlayer);
                // console.log(newPlayer.name,newPlayer.points);
                // console.log("Success!");

                var closeButton = await page.$(".Dialog__Button-sc-5bogmv-2");
                await closeButton.click();
                await delay();
            }

            try {
                const nextPageButton = await page.$$('.PaginatorButton__Button-xqlaki-0');
                await nextPageButton[2].click();
                await delay();

            } catch (e) {
                console.log("error: " + e);
            }
        }

        await browser.close();
    })();
}

function delay() {
    return new Promise(resolve => setTimeout(resolve, 50));
}

/// Socket Connections  ///
var socket = require('socket.io');
var io = socket(server);

io.sockets.on("connection", function (Socket) {
    Socket.on("get_player_by_id", function (data) {
        Player.findById(data, function (err, player) {
            if (err) {
                console.log(err);
                res.redirect("back");
            } else {
                io.sockets.emit('get_player', player);

            }
        });
    });
});


io.sockets.on("connection", function (Socket) {
    Socket.on('make_admin', function (userID) {
        User.findById(userID, function (err, user) {
            if (err) {
                console.log(err);
            } else {
                user.admin = 1;
                user.save();
                io.sockets.emit('user_isAdmin');
            }
        });

    });
});

io.sockets.on("connection", function (Socket) {
    Socket.on('update_database', function () {
        updateDB();
    });
});

io.sockets.on("connection", function (Socket) {
    Socket.on('get_update_time', function () {
        io.sockets.emit("database_update_time", updateTime);
    });
});

io.sockets.on("connection", function (Socket) {
    Socket.on('validate_team', function (playerIDs) {
        getPlayersByIDs().then(function (allPlayers) {
            var res = validateTeamAndGetResults(playerIDs, allPlayers);
            // console.log(res);
            if (res.valid) {
                // console.log(res);
                addTeamToUser(playerIDs, res.err.exceededBudget.moneyLeft);
            }

            io.sockets.emit('teamValidateResults', res);
        });
    });
});


function addTeamToUser(playerIDs, moneyLeftAfterPurchase, res) {
    // var currentUser = res.locals.currentUser;
    currentUser.hasTeam = 1;
    currentUser.team.players = playerIDs;
    moneyLeftAfterPurchase = Math.round((moneyLeftAfterPurchase * 100)) / 100;
    currentUser.team.moneyLeft = moneyLeftAfterPurchase;

    currentUser.save();
}


////////////////////////////////////////////////////////////////////////

//// The next 6 methoda are for checking if team is valid  /////

function validateTeamAndGetResults(playerIDs, allPlayers) {
    var chosenPlayers = getChosenPlayers(playerIDs, allPlayers);

    var fullteam = checkFullteam(playerIDs);
    var duplicatePlayers = checkPlayerDuplications(playerIDs);
    var moreThanThreeFromSameTeam = checkMoreThanThreeFromSameTeam(chosenPlayers);
    var exceededBudget = checkExceededBudget(chosenPlayers);

    var res = getValidationResults(fullteam, duplicatePlayers, moreThanThreeFromSameTeam, exceededBudget);

    return res;
}

function getValidationResults(fullteam, duplicatePlayers, moreThanThreeFromSameTeam, exceededBudget) {
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


//// The next 6 methoda are for checking if team is valid  /////

function checkFullteam(playerIDs) {
    var fullteam = true;
    playerIDs.forEach((id) => {
        if (id === "0") {
            fullteam = false;
        }
    });
    return fullteam;
}

function checkPlayerDuplications(playerIDs) {

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

function checkMoreThanThreeFromSameTeam(chosenPlayers) {
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

function checkExceededBudget(chosenPlayers) {

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

    return budgetExceeded;
}


function getChosenPlayers(playerIDs, allPlayers) {
    var chosenPlayers = [];

    for (let i = 0; i < playerIDs.length; i++) {
        if (playerIDs[i] !== "0") {
            chosenPlayers.push(allPlayers.find(function (player) {
                return (player._id == playerIDs[i]);
            }));
        }
    }


    return chosenPlayers;
}







