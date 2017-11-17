if (typeof(window._ASSET) !== 'function') {
    window._ASSET = function (u) {
        return u;
    };
}

window.jsonLoggingConfig = window.jsonLoggingConfig || undefined;
window.isLocalOrPreProd = window.location.host.indexOf("preprod") != -1 || window.location.host.indexOf("localhost") != -1;
window.isProduction = !isLocalOrPreProd;

if(console === undefined) {
    var dummy = function(v) {};
    function _console() {
        return {
            log: dummy,
            info: dummy,
            warn: dummy,
            error: dummy
        };
    }
    var console = new _console();
}

(function ($) {

    $.extend({
        jsonlog:function (params) {

            // validate input
            if (!params) {
                isProduction || console.warn('no parameter given');
                return false;
            }

            if (params !== Object(params)) {
                isProduction || console.warn('parameter is not an object');
                return false;
            }

            // logster sends error emails if the "object" field is missing
            // Redshift tables are missing "object" columns but have "_object" columns
            // Ergo, we will have both
            if (params._object === undefined && params.object !== undefined) {
                params._object = params.object;
            }

            if (params.object === undefined && params._object !== undefined) {
                params.object = params._object;
            }

            var mandatoryFields = ['_action', 'object', 'trigger'];

            for (var i = 0; i < mandatoryFields.length; i++) {
                if (params[mandatoryFields[i]] === undefined) {
                    isProduction || console.warn(mandatoryFields[i] + ' is missing from the parameter object');
                    return false;
                }
            }

            // default category is 'website'
            if (!params._category) {
                params._category = 'website';
            }

            // handle local callback
            if (isLocalOrPreProd) {
                if (typeof(params.log_callback) === 'function') {
                    params.log_callback();
                }
                console.log(params);
                return true;
            }

            if (!params.current_time) {
                params.current_time = new Date().getTime();
            }

            if (params._async === undefined) {
                params._async = true;
            }

            var get_current_url = function () {

                var path = window.location.pathname, log_path;

                if (prezi_id) {
                    log_path = 'landing_page';
                } else if (path === "/" || path.indexOf("/index/") === 0) {
                    log_path = 'cover_page';
                } else {
                    log_path = path.replace(/\//, "").replace(/-/g, "_").replace(/\//g, "_");
                    log_path += "page";
                }

                return log_path;
            };

            var get_prezi_id = function () {
                try {
                    if (window.Prezi) {
                        return Prezi.data.oid;
                    }
                } catch (e) {
                    // ignore
                }

                return null;
            };

            // internal

            var levels_allowed = ['INFO', 'WARN', 'ERROR'];
            var prezi_id = get_prezi_id();
            var source = get_current_url();

            // default settings
            var defaults = {
                name: 'debug',
                levelname: 'INFO',
                levelno: 20,
                created: parseInt(params.current_time / 1000, 10),
                msecs: params.current_time % 1000,
                relativeCreated: 0,
                msg: '',
                source: source,
                prezi_id: prezi_id,
                platform: 'website',
                session_id: '',
                client_datetime: (new Date()).toISOString()
            };

            var data = {};

            var settings = $.extend({}, defaults, params);

            var prepare_data = function (callback) {

                var i = 0, len = levels_allowed.length, level = null;
                for (i; i < len; i++) {
                    if (levels_allowed[i] === settings.levelname) {
                        level = settings.levelname;
                        break;
                    }
                }

                if (!level) {
                    isProduction || console.warn('unknown log level given');
                    return;
                } else {
                    data = $.extend({}, settings);
                    callback();
                }

            };

            // we don't want to log if the request was async or not
            delete data._async;

            var retryAjax = function(request) {
                request.tryCount++;
                if (request.tryCount <= request.retryLimit) {
                    isProduction || console.info("Retrying request...");
                    $.ajax(request);
                }
            }

            var _log_request = function () {
                $.ajax({
                    type: jsonLoggingConfig.method,
                    cache: false,
                    async: params._async,
                    url: jsonLoggingConfig.url,
                    contentType: 'application/json',
                        'headers': {
                        'authorization': jsonLoggingConfig.header
                    },
                    dataType: 'json',
                    timeout: 2000,
                    data: JSON.stringify([data]),
                    tryCount : 0,
                    retryLimit : 3,
                    success: function (data, status, xhr) {
                        if (data.success) {
                            isProduction || console.info("log submitted successfully");
                            if (typeof(params.log_callback) === 'function') {
                                params.log_callback();
                            }
                        } else {
                            isProduction || console.warn(data.error);
                        }
                    },
                    error: function (xhr, textStatus) {
                        isProduction || console.warn("backend problem encountered caused by: " + textStatus); // status can be error or timeout
                        if (typeof featureSwitch !== "undefined" && featureSwitch && featureSwitch.hasOwnProperty("testLoggingRetry")) {
                            retryAjax(this);
                        }
                    }
                });
            };

            var _log = function () {

                if (window.jsonLoggingConfig === undefined) {
                    $.ajax({
                        type: 'GET',
                        dataType: 'json',
                        url: Site.LOG_API_ENDPOINT + "/api/token/log/json/",
                        async: params._async,
                        success: function(data) {
                            window.jsonLoggingConfig = data;
                            _log_request();
                        },
                    }).fail(function(status) {
                        isProduction || console.error(status);
                    });
                } else {
                    _log_request();
                }

            };

            var _logging = function () {
                prepare_data(_log);
            };

            return _logging();
        }
    });

    if (window.JSON === undefined) {
        var s = $('<script/>').attr({
            'src':_ASSET('/assets/js/lib/json2.js')
        });
        $('head').append(s);
    }
})(jQuery);
