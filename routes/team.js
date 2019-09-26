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
            var scrambledTeam = getChosenPlayers(teamIDs, allPlayers);
            var teamByPositions = seperatePlayersToPositions(scrambledTeam);


            res.render("team/edit", {players: allPlayers, team: teamByPositions, hasTeam: true});
        }
    });
});


router.get("/generate11", middleware.isLoggedIn, middleware.userHasTeam, function (req, res) {
    generateLineup(req, res);
});

router.get("/generate15", middleware.isLoggedIn, function (req, res) {
    getValid15(req, res);
});

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
        var team = getChosenPlayers(teamIds, allPlayers);
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

function getInitialTeamByPoints(allPlayersByPositions) {
    var team = [];
    for (let i = 0; i < amountOfGKs; i++) {
        team.push(allPlayersByPositions.GKs[i]);
    }
    for (let i = 0; i < amountOfDEFs; i++) {
        team.push(allPlayersByPositions.DEFs[i]);
    }
    for (let i = 0; i < amountOfMIDs; i++) {
        team.push(allPlayersByPositions.MIDs[i]);
    }
    for (let i = 0; i < amountOfATKs; i++) {
        team.push(allPlayersByPositions.ATKs[i]);
    }

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

function getCheaperAndDifferentTeamPlayer(playerToReplace, allPlayersByPositions) {
    var cheaperAndDifferentTeamPlayer;
    var allPlayersFromNeededPosition = getPlayersFromPlayerPosition(playerToReplace.position, allPlayersByPositions);
    var validReplacement = false;
    var stringForPositionIndex = playerToReplace.position + "s";

    while (!validReplacement) {
        var neededIndex = currentIndexes[stringForPositionIndex];
        cheaperAndDifferentTeamPlayer = allPlayersFromNeededPosition[neededIndex];
        validReplacement = cheaperAndDifferentTeamPlayer.price < playerToReplace.price &&
            cheaperAndDifferentTeamPlayer.team !== playerToReplace.team;
        currentIndexes[stringForPositionIndex]++;
        playerToReplace = cheaperAndDifferentTeamPlayer;
    }

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

function improveTeamDuplicatesAndLowerPrice(team, allPlayersByPositions) {
    // 1. More than 3 from same team AND too expensive
    //			1.1 find the team with more than 3 players.
    //			1.2 choose one of the players from that team
    //			1.3 replace it with a player that COSTS_LESS & from DIFFERENT_TEAM & has SAME_POSITION

    //			* make sure to check the new player is not making more than 3 on OTHER team
    //			* make sure no player duplications

    var teamWIthMoreThanThreePlayers = getTeamWithMoreThanThreePlayers(team);
    var playersFromTheSameTeam = getAllPlayersFromSpecificTeam(team, teamWIthMoreThanThreePlayers);
    var playerToReplace = getPlayerWithLowestPointsPriceRatio(playersFromTheSameTeam);
    var newPlayerToImprove = getCheaperAndDifferentTeamPlayer(playerToReplace, allPlayersByPositions);
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
        playerToReplace = differentTeamPlayer;
        currentIndexes[stringForPositionIndex]++;
    }

    return differentTeamPlayer;
}

function improveTeamDuplicates(team, allPlayersByPositions) {
    // 1. find the team with more than 3 players.
    // 2. choose one of the players from that team
    // 3. replace it with a player that YOU HAVE MONEY FOR & from DIFFERENT_TEAM & has SAME_POSITION

    //			* make sure to check the new player is not making more than 3 on OTHER team
    //			* make sure no player duplications

    var teamWIthMoreThanThreePlayers = getTeamWithMoreThanThreePlayers(team);
    var playersFromTheSameTeam = getAllPlayersFromSpecificTeam(team, teamWIthMoreThanThreePlayers);
    var playerToReplace = getPlayerWithLowestPointsPriceRatio(playersFromTheSameTeam);
    var newPlayerToImprove = getDifferentTeamPlayer(playerToReplace, allPlayersByPositions, team);
    // 1. replace the player with the LOWEST Points/price ratio, with a cheaper player

    var finalTeam = swapPlayers(team, playerToReplace, newPlayerToImprove);

    return finalTeam;


}

function getPlayerWithLowestPointsPriceRatio(team) {
    var finalPlayer = team[0];
    var minPlayerPriceRatio = team[0].points / team[0].price;

    for (let i = 1; i < team.length; i++) {
        var currentPlayerRatio = (team[i].points / team[i].price);
        if (currentPlayerRatio < minPlayerPriceRatio) {
            minPlayerPriceRatio = currentPlayerRatio;
            finalPlayer = team[i];
        }
    }

    return finalPlayer;
}

function getCheaperPlayerToReplace(playerToReplace, allPlayersByPositions) {
    var cheaperPlayer;
    var allPlayersFromNeededPosition = getPlayersFromPlayerPosition(playerToReplace.position, allPlayersByPositions);
    var validReplacement = false;
    var stringForPositionIndex = playerToReplace.position + "s";

    while (!validReplacement) {
        var neededIndex = currentIndexes[stringForPositionIndex];
        cheaperPlayer = allPlayersFromNeededPosition[neededIndex];
        validReplacement = cheaperPlayer.price < playerToReplace.price;
        currentIndexes[stringForPositionIndex]++;
        playerToReplace = cheaperPlayer;

    }

    return cheaperPlayer;
}

function improveTeamByLoweringPrice(team, allPlayersByPositions) {
    // 1. replace the player with the LOWEST Points/price ratio, with a cheaper player

    //			* make sure to check the new player is not making more than 3 on OTHER team
    //			* make sure no player duplications

    var playerToReplace = getPlayerWithLowestPointsPriceRatio(team);
    var cheaperPlayer = getCheaperPlayerToReplace(playerToReplace, allPlayersByPositions)

    var finalTeam = swapPlayers(team, playerToReplace, cheaperPlayer);

    return finalTeam;
}

async function getAllPlayersASync() {
    return await Player.find({}, {});
}


function getValid15(req, res) {
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
        // 3. generate first team, by points
        var team = getInitialTeamByPoints(allPlayersByPositions);

        teamIDs = getPlayerIDs(team);
        //    no duplicates.
        // 4. validate team:
        var teamValidationResults = validateTeamAndGetResults(teamIDs, allPlayers);

        while (!teamValidationResults.valid) {
            if (teamValidationResults.err.moreThanThree && teamValidationResults.err.exceededBudget.exceeded) {
                // console.log("DEBUG cheap AND team");
                team = improveTeamDuplicatesAndLowerPrice(team, allPlayersByPositions);
            } else if (teamValidationResults.err.moreThanThree) {
                // console.log("DEBUG TEAM");

                team = improveTeamDuplicates(team, allPlayersByPositions);
            } else if (teamValidationResults.err.exceededBudget.exceeded) {
                // console.log("DEBUG PRICE");
                team = improveTeamByLoweringPrice(team, allPlayersByPositions)
            }

            teamIDs = getPlayerIDs(team);
            teamValidationResults = validateTeamAndGetResults(teamIDs, allPlayers);
        }

        addTeamToUser(teamIDs, teamValidationResults.err.exceededBudget.moneyLeft, res);
        req.flash("success", "Team generated successfuly!");
        res.redirect("/team");
    });

}


/////////////////////////////////////////////////////////////////////////

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

function addTeamToUser(playerIDs, moneyLeftAfterPurchase, res) {
    var currentUser = res.locals.currentUser;
    currentUser.hasTeam = 1;
    currentUser.team.players = playerIDs;
    moneyLeftAfterPurchase = Math.round((moneyLeftAfterPurchase * 100)) / 100;
    currentUser.team.moneyLeft = moneyLeftAfterPurchase;

    currentUser.save();
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


module.exports = router;
