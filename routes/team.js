var express = require("express");
var router = express.Router();
var Player = require("../models/player");
var middleware = require("../middleware");


// INDEX - user's team
router.get("/", middleware.isLoggedIn, function (req, res) {
    res.render("team/index");
});


// CREATE - add new team
router.get("/new", middleware.isLoggedIn, function (req, res) {
    Player.find({}, function (err, allPlayers) {
        if (err) {
            console.log(err);
            res.redirect("back");
        } else {
            allPlayers = allPlayers.sort((a, b) => (a.points > b.points) ? -1 : 1);
            res.render("team/edit", {players: allPlayers, hasTeam: false});
        }
    });
});

router.get("/edit", middleware.isLoggedIn, middleware.userHasTeam, function (req, res) {
    Player.find({}, function (err, allPlayers) {
        if (err) {
            console.log(err);
            res.redirect("back");
        } else {
            allPlayers = allPlayers.sort((a, b) => (a.points > b.points) ? -1 : 1);
            var teamIDs = res.locals.currentUser.team.players;
            var scrambledTeam = middleware.getChosenPlayers(teamIDs, allPlayers);
            var teamByPositions = seperatePlayersToPositions(scrambledTeam);

            console.log(teamIDs);
            console.log(teamByPositions);

            res.render("team/edit", {players: allPlayers, team: teamByPositions, hasTeam: true});
        }
    });
});


router.get("/generate11", middleware.isLoggedIn, middleware.userHasTeam, function (req, res) {
    generateLineup(req, res);
});

router.get("/generate15", middleware.isLoggedIn, function (req, res) {
    getValid15(req, res, []);
});

router.post("/autofill", middleware.isLoggedIn, function (req, res) {
    var playerIDs = req.body.team.split(',');
    getValid15(req, res, playerIDs);
});


// -----------------------------------------------------------------------------------------

var amountOfGKs = 2;
var amountOfDEFs = 5;
var amountOfMIDs = 5;
var amountOfATKs = 3;
var currentIndexes;


function getCaptains(team) {
    var captain, viceCaptain;

    if (team[0].points > team[1].points) {
        captain = team[0];
        viceCaptain = team[1];
    } else {
        captain = team[1];
        viceCaptain = team[0];
    }

    for (let i = 2; i < team.length; i++) {
        if (team[i].points > captain.points) {
            viceCaptain = captain;
            captain = team[i];
        } else if (team[i].points > viceCaptain.points) {
            viceCaptain = team[i];
        }
    }

    return {captain: captain, viceCaptain: viceCaptain};
}

function getTheRestOfThePlayersThatLeft(teamByPositions) {
    var res = [];
    res.push(teamByPositions.DEFs[3]);
    res.push(teamByPositions.DEFs[4]);

    res.push(teamByPositions.MIDs[2]);
    res.push(teamByPositions.MIDs[3]);
    res.push(teamByPositions.MIDs[4]);

    res.push(teamByPositions.ATKs[1]);
    res.push(teamByPositions.ATKs[2]);

    return res;
}

function initializeTeam(team, teamByPositions) {
    var res = {
        Goalkeeper: [],
        Defenders: [],
        Midfielders: [],
        Forwards: [],
        Bench: [],
        Captain: undefined,
        ViceCaptain: undefined
    };

    var captains = getCaptains(team);

    res.Captain = captains.captain;
    res.ViceCaptain = captains.viceCaptain;

    res.Goalkeeper.push(teamByPositions.GKs[0]);

    res.Defenders.push(teamByPositions.DEFs[0]);
    res.Defenders.push(teamByPositions.DEFs[1]);
    res.Defenders.push(teamByPositions.DEFs[2]);

    res.Midfielders.push(teamByPositions.MIDs[0]);
    res.Midfielders.push(teamByPositions.MIDs[1]);

    res.Forwards.push(teamByPositions.ATKs[0]);

    var playersLeft = getTheRestOfThePlayersThatLeft(teamByPositions);

    playersLeft.sort((a, b) => (a.points > b.points) ? -1 : 1);

    for (let i = 0; i < 4; i++) {
        if (playersLeft[i].position === "Defender") {
            res.Defenders.push(playersLeft[i]);
        } else if (playersLeft[i].position === "Midfielder") {
            res.Midfielders.push(playersLeft[i]);
        } else if (playersLeft[i].position === "Forward") {
            res.Forwards.push(playersLeft[i]);
        }
    }


    for (let i = 4; i < playersLeft.length; i++) {
        res.Bench.push(playersLeft[i]);

    }

    res.Bench.push(teamByPositions.GKs[1]);

    return res;
}

function getUltimateLineup(team) {
    var teamByPositions = seperatePlayersToPositions(team);
    var ultimateLineup = initializeTeam(team, teamByPositions);
    return ultimateLineup;
}

function generateLineup(req, res) {
    getAllPlayersASync().then(function (allPlayers) {
        allPlayers = allPlayers.sort((a, b) => (a.points > b.points) ? -1 : 1);
        var teamIds = res.locals.currentUser.team.players;
        var team = middleware.getChosenPlayers(teamIds, allPlayers);
        var generatedLineup = getUltimateLineup(team);

        res.render("team/lineup", {lineup: generatedLineup});
    });
}

function seperatePlayersToPositions(allPlayers) {
    var seperatedPlayers = {
        GKs: [],
        DEFs: [],
        MIDs: [],
        ATKs: []
    };

    allPlayers.forEach(function (player) {
        if (player.position === "Goalkeeper") {
            seperatedPlayers.GKs.push(player);
        } else if (player.position === "Defender") {
            seperatedPlayers.DEFs.push(player);
        } else if (player.position === "Midfielder") {
            seperatedPlayers.MIDs.push(player);
        } else if (player.position === "Forward") {
            seperatedPlayers.ATKs.push(player);
        }
    });
    seperatedPlayers.GKs.sort((a, b) => (a.points > b.points) ? -1 : 1);
    seperatedPlayers.DEFs.sort((a, b) => (a.points > b.points) ? -1 : 1);
    seperatedPlayers.MIDs.sort((a, b) => (a.points > b.points) ? -1 : 1);
    seperatedPlayers.ATKs.sort((a, b) => (a.points > b.points) ? -1 : 1);


    return seperatedPlayers;
}

function getAmountsToAdd(currentTeam) {
    var amounts = {
        GKs: 0,
        DEFs: 0,
        MIDs: 0,
        ATKs: 0
    };

    currentTeam.forEach(function (player) {
        if (player.position === "Goalkeeper") {
            amounts.GKs++;
        } else if (player.position === "Defender") {
            amounts.DEFs++;
        } else if (player.position === "Midfielder") {
            amounts.MIDs++;
        } else if (player.position === "Forward") {
            amounts.ATKs++;
        }
    });

    amounts.GKs = amountOfGKs - amounts.GKs;
    amounts.DEFs = amountOfDEFs - amounts.DEFs;
    amounts.MIDs = amountOfMIDs - amounts.MIDs;
    amounts.ATKs = amountOfATKs - amounts.ATKs;

    return amounts;
}

function getInitialTeamByPoints(allPlayersByPositions, currentTeam) {


    var team = [];
    var amounts = getAmountsToAdd(currentTeam);
    // console.log(amounts);

    currentTeam.forEach(function (player) {
        team.push(player);
    });

    var i = 0;

    while (amounts.GKs != 0) {
        if (!team.find(function (player) {
            return (player._id == allPlayersByPositions.GKs[i]._id);
        })) {
            team.push(allPlayersByPositions.GKs[i]);
            amounts.GKs--;
        }
        i++;
    }

    i = 0;

    while (amounts.DEFs != 0) {
        if (!team.find(function (player) {
            return (player._id == allPlayersByPositions.DEFs[i]._id);
        })) {
            team.push(allPlayersByPositions.DEFs[i]);
            amounts.DEFs--;
        }
        i++;
    }

    i = 0;
    while (amounts.MIDs != 0) {
        if (!team.find(function (player) {
            return (player._id == allPlayersByPositions.MIDs[i]._id);
        })) {
            team.push(allPlayersByPositions.MIDs[i]);
            amounts.MIDs--;
        }
        i++;
    }
    i = 0;
    while (amounts.ATKs != 0) {
        if (!team.find(function (player) {
            return (player._id == allPlayersByPositions.ATKs[i]._id);
        })) {
            team.push(allPlayersByPositions.ATKs[i]);
            amounts.ATKs--;
        }
        i++;
    }


    console.log(team, team.length);

    return team;
}

function getPlayerIDs(team) {
    var playerIDs = [];

    team.forEach(function (player) {
        playerIDs.push(player._id);
    });

    return playerIDs;
}

function getTeamWithMoreThanThreePlayers(team) {
    var teamWIthMoreThanThreePlayers = "";
    var teamsBucket = [];

    team.forEach((player) => {

        if (!teamsBucket[player.team]) {
            teamsBucket[player.team] = 1;
        } else {
            teamsBucket[player.team]++;

            if (teamsBucket[player.team] > 3) {
                teamWIthMoreThanThreePlayers = player.team;
            }
        }
    });

    return teamWIthMoreThanThreePlayers;
}

function getAllPlayersFromSpecificTeam(team, teamWIthMoreThanThreePlayers) {
    var finalTeam = [];

    team.forEach(function (player) {
        if (player.team === teamWIthMoreThanThreePlayers) {
            finalTeam.push(player);
        }
    });

    return finalTeam;
}

function getPlayersFromPlayerPosition(position, allPlayersByPositions) {
    var playersFromNeededPosition;

    if (position === "Goalkeeper") {
        playersFromNeededPosition = allPlayersByPositions.GKs;
    } else if (position === "Defender") {
        playersFromNeededPosition = allPlayersByPositions.DEFs;
    } else if (position === "Midfielder") {
        playersFromNeededPosition = allPlayersByPositions.MIDs;
    } else if (position === "Forward") {
        playersFromNeededPosition = allPlayersByPositions.ATKs;
    }

    return playersFromNeededPosition;
}

function getCheaperAndDifferentTeamPlayer(playerToReplace, allPlayersByPositions, team) {
    var cheaperAndDifferentTeamPlayer;
    var allPlayersFromNeededPosition = getPlayersFromPlayerPosition(playerToReplace.position, allPlayersByPositions);
    var validReplacement = false;
    var stringForPositionIndex = playerToReplace.position + "s";

    while (!validReplacement) {
        var neededIndex = currentIndexes[stringForPositionIndex];
        cheaperAndDifferentTeamPlayer = allPlayersFromNeededPosition[neededIndex];
        console.log("1.", cheaperAndDifferentTeamPlayer);
        console.log("2.", playerToReplace);
        if (cheaperAndDifferentTeamPlayer) {
            validReplacement = cheaperAndDifferentTeamPlayer.price < playerToReplace.price &&
                cheaperAndDifferentTeamPlayer.team !== playerToReplace.team;
            currentIndexes[stringForPositionIndex]++;
            // if (cheaperAndDifferentTeamPlayer.price < playerToReplace.price) {
            if (cheaperAndDifferentTeamPlayer.price > 4.8 && !team.find(function (player) {
                return (player._id == cheaperAndDifferentTeamPlayer._id);
            })) {

                playerToReplace = cheaperAndDifferentTeamPlayer;
            } else {
                validReplacement = false;
            }
            // }
        } else {
            currentIndexes[stringForPositionIndex] = 0;
        }

    }

    console.log("-------------------------------------");

    return cheaperAndDifferentTeamPlayer;

}

function swapPlayers(team, playerToReplace, newPlayerToImprove) {
    var res = [];

    team.forEach(function (player) {
        if (player._id === playerToReplace._id) {
            res.push(newPlayerToImprove);
        } else {
            res.push(player);
        }
    });

    return res;
}

function improveTeamDuplicatesAndLowerPrice(team, allPlayersByPositions, playerIDs) {
    // 1. More than 3 from same team AND too expensive
    //			1.1 find the team with more than 3 players.
    //			1.2 choose one of the players from that team
    //			1.3 replace it with a player that COSTS_LESS & from DIFFERENT_TEAM & has SAME_POSITION

    //			* make sure to check the new player is not making more than 3 on OTHER team
    //			* make sure no player duplications

    var teamWIthMoreThanThreePlayers = getTeamWithMoreThanThreePlayers(team);
    var playersFromTheSameTeam = getAllPlayersFromSpecificTeam(team, teamWIthMoreThanThreePlayers);
    var playerToReplace = getPlayerWithLowestPointsPriceRatio(playersFromTheSameTeam, playerIDs);
    var newPlayerToImprove = getCheaperAndDifferentTeamPlayer(playerToReplace, allPlayersByPositions, team);
    // 1. replace the player with the LOWEST Points/price ratio, with a cheaper player

    var finalTeam = swapPlayers(team, playerToReplace, newPlayerToImprove);

    return finalTeam;
}

function getTeamPrice(team) {
    var teamPriceSum = 0;

    team.forEach(function (player) {
        teamPriceSum += player.price;
    });

    teamPriceSum = Math.round((teamPriceSum * 100)) / 100;

    return teamPriceSum;
}

function getDifferentTeamPlayer(playerToReplace, allPlayersByPositions, team) { // HERE
    var differentTeamPlayer;
    var allPlayersFromNeededPosition = getPlayersFromPlayerPosition(playerToReplace.position, allPlayersByPositions);
    var validReplacement = false;
    var stringForPositionIndex = playerToReplace.position + "s";
    var teamPrice = getTeamPrice(team);

    while (!validReplacement) {
        teamPrice -= playerToReplace.price;
        var neededIndex = currentIndexes[stringForPositionIndex];
        differentTeamPlayer = allPlayersFromNeededPosition[neededIndex];
        teamPrice += differentTeamPlayer.price;

        validReplacement = teamPrice <= 100 &&
            differentTeamPlayer.team !== playerToReplace.team;
        if (differentTeamPlayer.price > 4.8 && !team.find(function (player) {
            return (player._id == differentTeamPlayer._id);
        })) {
            playerToReplace = differentTeamPlayer;
        } else {
            validReplacement = false;
        }
        currentIndexes[stringForPositionIndex]++;
    }

    return differentTeamPlayer;
}

function improveTeamDuplicates(team, allPlayersByPositions, playerIDs) {
    // 1. find the team with more than 3 players.
    // 2. choose one of the players from that team
    // 3. replace it with a player that YOU HAVE MONEY FOR & from DIFFERENT_TEAM & has SAME_POSITION

    //			* make sure to check the new player is not making more than 3 on OTHER team
    //			* make sure no player duplications

    var teamWIthMoreThanThreePlayers = getTeamWithMoreThanThreePlayers(team);
    var playersFromTheSameTeam = getAllPlayersFromSpecificTeam(team, teamWIthMoreThanThreePlayers);
    var playerToReplace = getPlayerWithLowestPointsPriceRatio(playersFromTheSameTeam, playerIDs);
    var newPlayerToImprove = getDifferentTeamPlayer(playerToReplace, allPlayersByPositions, team);
    // 1. replace the player with the LOWEST Points/price ratio, with a cheaper player

    var finalTeam = swapPlayers(team, playerToReplace, newPlayerToImprove);

    return finalTeam;


}

function getPlayerWithLowestPointsPriceRatio(team, playerIDs) {
    var finalPlayer;
    var minPlayerPriceRatio;


    for (let i = 0; i < team.length; i++) {
        if (team[i].price > 4.9 && !playerIDs.find(function (player) {
            return (player == team[i]._id);
        })) {
            finalPlayer = team[i];
            minPlayerPriceRatio = team[i].points / team[i].price;
            break;
        }
    }


    for (let i = 0; i < team.length; i++) {
        var currentPlayerRatio = (team[i].points / team[i].price);

        // if(team[i].name == "Romelu Lukaku"){
        //     console.log("playerIDs:", playerIDs);
        //     console.log("team[i].id:", team[i]._id);
        // }

        if (currentPlayerRatio < minPlayerPriceRatio && team[i].price > 4.9 &&
            !playerIDs.find(function (player) {
                return (player == team[i]._id);
            })) {

            minPlayerPriceRatio = currentPlayerRatio;
            finalPlayer = team[i];
        }
    }

    return finalPlayer;
}

function getCheaperPlayerToReplace(playerToReplace, allPlayersByPositions, team) {
    var cheaperPlayer;
    var allPlayersFromNeededPosition = getPlayersFromPlayerPosition(playerToReplace.position, allPlayersByPositions);
    var validReplacement = false;
    var stringForPositionIndex = playerToReplace.position + "s";

    while (!validReplacement) {
        var neededIndex = currentIndexes[stringForPositionIndex];
        cheaperPlayer = allPlayersFromNeededPosition[neededIndex];

        if (cheaperPlayer) {
            console.log("Cheaper: ", cheaperPlayer);
            console.log("Player: ", playerToReplace);
            validReplacement = cheaperPlayer.price < playerToReplace.price;
            currentIndexes[stringForPositionIndex]++;
            //
            if (cheaperPlayer.price > 4.8 && !team.find(function (player) {
                return (player._id == cheaperPlayer._id);
            })) {

                playerToReplace = cheaperPlayer;
            } else {
                validReplacement = false;
            }
        } else {
            currentIndexes[stringForPositionIndex] = 0;
        }

    }

    return cheaperPlayer;
}

function improveTeamByLoweringPrice(team, allPlayersByPositions, playerIDs) {
    // 1. replace the player with the LOWEST Points/price ratio, with a cheaper player

    //			* make sure to check the new player is not making more than 3 on OTHER team
    //			* make sure no player duplications

    var playerToReplace = getPlayerWithLowestPointsPriceRatio(team, playerIDs);
    var cheaperPlayer = getCheaperPlayerToReplace(playerToReplace, allPlayersByPositions, team)

    var finalTeam = swapPlayers(team, playerToReplace, cheaperPlayer);

    return finalTeam;
}

async function getAllPlayersASync() {
    return await Player.find({}, {});
}

function getValid15(req, res, playerIDs) {
    currentIndexes = {
        Goalkeepers: 2,
        Defenders: 5,
        Midfielders: 5,
        Forwards: 3
    };
    // put on global file.
    var teamIDs = [];
    var valid = false;
    // 1. get ALL players from DB
    getAllPlayersASync().then(function (allPlayers) {
        // 2. seperate to different arrays by POSITION
        var allPlayersByPositions = seperatePlayersToPositions(allPlayers);
        var currentTeam = middleware.getChosenPlayers(playerIDs, allPlayers);
        // 3. generate first team, by points
        // console.log(currentTeam);
        var team = getInitialTeamByPoints(allPlayersByPositions, currentTeam);
        // console.log("Team:", team);

        teamIDs = getPlayerIDs(team);
        //    no duplicates.
        // 4. validate team:

        var teamValidationResults = middleware.validateTeamAndGetResults(teamIDs, allPlayers);

        while (!teamValidationResults.valid) {
            if (teamValidationResults.err.moreThanThree && teamValidationResults.err.exceededBudget.exceeded) {
                // console.log("DEBUG cheap AND team");
                team = improveTeamDuplicatesAndLowerPrice(team, allPlayersByPositions, playerIDs);

                console.log(" ---------------- 1 ----------------");
            } else if (teamValidationResults.err.moreThanThree) {
                // console.log("DEBUG TEAM");
                console.log(" ---------------- 2 ----------------");

                team = improveTeamDuplicates(team, allPlayersByPositions, playerIDs);
            } else if (teamValidationResults.err.exceededBudget.exceeded) {
                // console.log("DEBUG PRICE");
                console.log(" ---------------- 3 ----------------");

                team = improveTeamByLoweringPrice(team, allPlayersByPositions, playerIDs);
            }

            teamIDs = getPlayerIDs(team);
            teamValidationResults = middleware.validateTeamAndGetResults(teamIDs, allPlayers);
        }

        addTeamToUser(teamIDs, teamValidationResults.err.exceededBudget.moneyLeft, res);
        req.flash("success", "Team generated successfuly!");
        res.redirect("/team");
    });

}


function addTeamToUser(playerIDs, moneyLeftAfterPurchase, res) {
    var currentUser = res.locals.currentUser;
    currentUser.hasTeam = 1;
    currentUser.team.players = playerIDs;
    moneyLeftAfterPurchase = Math.round((moneyLeftAfterPurchase * 100)) / 100;
    currentUser.team.moneyLeft = moneyLeftAfterPurchase;

    currentUser.save();
}


module.exports = router;
