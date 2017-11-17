/*jslint browser:true, laxbreak:true, maxerr:1000, debug:true */
/*globals t_pagestart, Prezi */
/*extern jquery */

$(document).ready(function () {
    $('[data-action]').each(function(){
        $(this).bindFirst('click', function() {
            var _action = $(this).data('action');
            var object = $(this).data('object');
            link_logger(_action, object);
        });
    });
});