var socket;
socket = io.connect(window.location.hostname);

$("#user_makeAdmin").on('click', function () {
    var userSelect = $("#usersList");
    if (userSelect.val()) {
        socket.emit("make_admin", userSelect.val());
    }
});

socket.on('user_isAdmin', () => {
    location.reload();
});

$("#edit_article").on('click', function () {
    var articlesSelect = $("#articlesList");
    if (articlesSelect.val()) {
        var editID = articlesSelect.val();
        window.location.replace("/articles/edit/" + editID);
    }
});

$("#update_db").on('click', function () {
    socket.emit("update_database");
});

socket.on('database_updated', () => {
    console.log("database is updated");
});


function getCurrentUpdateTime() {
    socket.emit("get_update_time");
}

socket.on('database_update_time', (time) => {
    var times = time.split(',');

    $('#dayPicker').val(times[1]);
    $('#hourPicker').val(times[0]);
});

getCurrentUpdateTime();
