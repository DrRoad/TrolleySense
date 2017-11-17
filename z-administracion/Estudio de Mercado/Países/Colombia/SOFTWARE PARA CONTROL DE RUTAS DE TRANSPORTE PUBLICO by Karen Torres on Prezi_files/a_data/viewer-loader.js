var PreziViewerModule = function(Module, onLoad, baseName, onError) {

  Module = Module || {};

  var chronoNow =
    typeof window['performance'] === 'object' && typeof window['performance']['now'] === 'function'
    ? window['performance']['now'].bind(window['performance'])
    : Date.now;

  function hasSendLog(hostInterface) {
    return hostInterface && (typeof hostInterface.sendLog === 'function');
  }

  function sendLoadTimeRangeLog(status, start, complete) {
    var hostInterface = Module['hostInterface'];
    if (hasSendLog(hostInterface)) {
      hostInterface.sendLog("loading_status", "machine", {
        status: status,
        table: "loading_time",
        chrono_start: start,
        chrono_end: complete
      });
    }
  }

  Module['sendLoadStatus'] = function(status) {
    var hostInterface = Module['hostInterface'];
    if (hasSendLog(hostInterface)) {
      hostInterface.sendLog("loading_status", "machine", {
        status: status,
        table: "loading_time",
        chrono_now: chronoNow()
      });
    }
  };


  function loadScript(src, onLoad) {
    var script = document.createElement('script');
    script.src = src;
    script.onload = onLoad;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  }

  function loadEmscriptenScripts(asmjs, js, onLoad) {
    loadScript(asmjs,
      function() {
        setTimeout(loadScript, 1, js, onLoad);
      }
    );
  }

  baseName = baseName || 'viewer';

  var asmjs = baseName + '.asm.js';
  var js = baseName + '.js';
  if (typeof Module['locateFile'] === 'function') {
    asmjs = Module['locateFile'](asmjs);
    js = Module['locateFile'](js);
  }

  var viewer_download_start = chronoNow();
  loadEmscriptenScripts(asmjs, js, function() {
    var viewer_download_complete = chronoNow();
    sendLoadTimeRangeLog(
      'viewer_download',
      viewer_download_start,
      viewer_download_complete);

    if (typeof PreziViewerModuleInternal === 'function') {
      Module = PreziViewerModuleAsm(Module)
      var Viewer = PreziViewerModuleInternal(Module);


      if (typeof onLoad === 'function') {
        onLoad(Viewer);
      }
    } else if (typeof onError === 'function') {
        onError();
    }
  });
}
