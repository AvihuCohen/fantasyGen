var socket;
var url;


if(window.location.hostname === "localhost"){
    url = "http://localhost:3000";
} else {
    url = window.location.hostname;
}

socket = io.connect(url);

console.log("Connect111");

var allPlayers;
var pagesOfPlayers = [];

getAllPlayers();

function getAllPlayers() {
    socket.emit("get_all_players");
}

socket.on('get_all_players', (result) => {
   allPlayers = result;

   for (var i = 0; i < (allPlayers.length / 15); i++){
       var page = [];
       for (var j = 0; j < 15; j ++){
            page.push(allPlayers[(i * 15) + j]);
       }
       pagesOfPlayers.push(page);
   }
});


$('#previousButton').on('click', function () {
    console.log($('#currentPage').text());
    var currentPageNumber = Number($('#currentPage').text()) - 1;

    if(currentPageNumber !== 0){
        var currentPage = pagesOfPlayers[currentPageNumber - 1];
        for (let i = 0; i < currentPage.length ; i++) {
            // var id = "#" + "playerImage" + i;
            $("#" + "playerImage" + i).attr('src', currentPage[i].imageURL);
            $("#" + "playerPosition" + i).text(currentPage[i].position);
            $("#" + "playerName" + i).text(currentPage[i].name);
            $("#" + "playerPrice" + i).text(currentPage[i].price);
            $("#" + "playerPoints" + i).text(currentPage[i].points);
            $("#" + "playerTeam" + i).text(currentPage[i].team);

        }

        $('#currentPage').text(currentPageNumber);
        console.log($('#currentPage').text());

    }


});

$('#nextButton').on('click', function () {
    console.log($('#currentPage').text());

    var currentPageNumber = Number($('#currentPage').text());
    if(currentPageNumber < pagesOfPlayers.length){
        var currentPage = pagesOfPlayers[currentPageNumber];
        for (let i = 0; i < currentPage.length ; i++) {
            var id = "#" + "playerImage" + i;
            // $(id).attr('src', currentPage[i].imageURL);
            $("#" + "playerImage" + i).attr('src', currentPage[i].imageURL);
            $("#" + "playerPosition" + i).text(currentPage[i].position);
            $("#" + "playerName" + i).text(currentPage[i].name);
            $("#" + "playerPrice" + i).text(currentPage[i].price);
            $("#" + "playerPoints" + i).text(currentPage[i].points);
            $("#" + "playerTeam" + i).text(currentPage[i].team);
        }
        $('#currentPage').text(currentPageNumber + 1);
    }
});



// console.log(allPlayers);

