require("applicationinsights")
    .setup()
    .setAutoDependencyCorrelation(true)
    .start();

const Debug = require("vm").runInDebugContext("Debug");
const http = require("http");
const path = require("path");
const url = require("url");

const BREAK_EVENT_TYPE = 1;
const ROOT_DIR =  path.dirname(require.main.filename);

const logPoints = new Map();
Debug.setListener((eventType, state, eventData) => {
    if (eventType !== BREAK_EVENT_TYPE) {
        return;
    }
    
    const breakpointId = eventData.breakPointsHit()[0].script_break_point().number();
    if (logPoints.has(breakpointId)) {
        const exp = logPoints.get(breakpointId);
        const frame = state.frame(0);
        const result = frame.evaluate(exp);
        console.log(result.value());
    }
});

function addBreakpoint(file, lineNumber, expression) {
    const fileName = path.join(__dirname, file);
    const breakpointId = Debug.setScriptBreakPointByName(fileName, lineNumber);
    logPoints.set(breakpointId, expression);
}

http.createServer((req, res) => {
    const { pathname, query } = url.parse(req.url, true);

    switch (pathname.substr("1")) {
        case "clear":
            Debug.clearAllBreakPoints();
            break;

        case "logpoint":
            const { file, line, expression } = query;
            if (!file || !line || !expression) {
                return res.end("Invalid args");
            }

            addBreakpoint(file, Number.parseInt(line), expression);
            break;
    }

    // TODO: Allow removing single breakpoints
    // TODO: Allow removing all breakpoints

    res.end("OK");
}).listen(8967);

require("./{{STARTUP_FILE}}");