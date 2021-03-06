var socket;
var url;

if (window.location.hostname === "localhost") {
    url = "http://localhost:3000";
} else {
    url = window.location.hostname;
}
socket = io.connect(url);

var lastSelected;
var lastPrice = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

initializeLastPrices();

function initializeLastPrices() {
    var priceSpans = $(".priceSpan");

    for (let i = 0; i < priceSpans.length; i++) {
        lastPrice[i] = Number(priceSpans[i].textContent);
    }
}

$('select').on('change', function () {
    var data = $(this).val();
    // console.log(data);
    lastSelected = $(this);
    socket.emit("get_player_by_id", data);
});

$('#autofillButton').on('click', function () {
    var playerIDs = getSelectedPlayerIDs();
    var numOfSelectedPlayers = 0;

    playerIDs.forEach(function (player) {
        if (player != "0") {
            numOfSelectedPlayers++;
        }
    });
    if (numOfSelectedPlayers <= 3) {
        const form = document.createElement('form');
        form.method = "POST";
        form.action = "/team/autofill";

        const hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.name = "team";
        hiddenField.value = playerIDs;

        form.appendChild(hiddenField);

        document.body.appendChild(form);
        form.submit();
    } else {
        alert("You can choose up to 3 players to use Auto-fill.");
        window.location.replace("/team/edit");
    }
});

function getSelectedPlayerIDs() {
    var playerSelects = $(".dropdownPlayers");
    var playerIDs = [];

    for (let i = 0; i < playerSelects.length; i++) {
        playerIDs.push(playerSelects[i].value);
    }
    return playerIDs;
}

$('#sumbitTeamButton').on('click', function () {
    var errorItems = $(".errorItem");
    errorItems.css("display", "none");

    var playerIDs = getSelectedPlayerIDs();

    socket.emit("validate_team", playerIDs);
});

socket.on('teamValidateResults', (result) => {
    if (result.valid) {
        window.location.replace("/team");
    } else {
        $("#errorDisplay").css("display", "block");
        if (!result.err.fullteam) {
            $("#fullteam").css("display", "block");
        }
        if (result.err.playerDuplicate) {
            $("#playerDuplicate").css("display", "block");
        }
        if (result.err.exceededBudget.exceeded) {
            $("#exceededBudget").css("display", "block");
        }
        if (result.err.moreThanThree) {
            $("#moreThanThree").css("display", "block");
        }
    }
});


socket.on('get_player', (player) => {
    var lastSelecetedID = (lastSelected.attr('id'));
    var totalFundsLeft = Number($("#totalFunds").text());
    var splittedID = lastSelecetedID.split("select");
    var cardNumber = Number(splittedID[1]);
    $("#totalFunds").text(String(totalFundsLeft + lastPrice[cardNumber]));
    totalFundsLeft += lastPrice[cardNumber];

    var theCardID = "#card" + splittedID[1];
    $(theCardID + " .playerCardImage").attr('src', player.imageURL);
    $(theCardID + " .pointsSpan").text(player.points);
    var shortName = player.name;
    if (player.name.length > 15) {
        shortName = player.name.slice(0, 13) + "..";
    }
    $(theCardID + " .nameSpan").text(shortName);
    $(theCardID + " .priceSpan").text(player.price);
    var totalFunds = Math.round((totalFundsLeft - player.price) * 100) / 100;
    $("#totalFunds").text(String(totalFunds));
    lastPrice[cardNumber] = player.price;

});


// createValidTeam();

function createValidTeam() {
    var playerSelects = $(".dropdownPlayers");

    for (let i = 0; i < playerSelects.length; i++) {
        var option = playerSelects[i].childNodes;
        playerSelects[i].value = playerSelects[i].children[i + 10].value;

    }
}