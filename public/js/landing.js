$('.card').on('click', function () {
    var link = $(this).find('a');
    link = link[0].href;
    window.location.href = link;
});