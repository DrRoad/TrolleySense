$(document).ready(function() {
    setTimeout(
        function() {
            // reveal it after a while anyway
            $('#webgl_beta_banner').removeClass('hidden');
        }, 30000);
    $("#ln_back_to_flash").click(function(event) {
        var iframe = $("#iframe_container").get(0);
        if (!iframe || !iframe.contentWindow) {
            return;
        }
        var w = iframe.contentWindow;
        if (w.webglViewerApp && w.webglViewerApp.Main) {
            iframe.contentWindow.webglViewerApp.Main.requestFallbackToFlashFromParent();
        } else if (w.EmbedPrezi && w.fallbackToFlash) {
            // if no App to log, then do the switchback anyway!
            EmbedPrezi.fallbackToFlash();
        }
        event.preventDefault();
    });
});
