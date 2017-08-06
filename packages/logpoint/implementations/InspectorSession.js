let inspectorSession;
function ensureSession() {
  if (!inspectorSession) {
    // The inspector module only supports a single
    // client at a time, so we need to multiplex
    // multiple instances of InspectorSession
    // through a single underlying session instance
    const { Session } = require("inspector");
    inspectorSession = new Session();
    inspectorSession.connect();
    inspectorSession.post("Debugger.enable");
  }

  return inspectorSession;
}

// https://chromedevtools.github.io/devtools-protocol/v8/
module.exports = class InspectorSession extends require("./BaseSession") {
  constructor(logPrefix = "") {
    super(logPrefix);

    this._inspectorSession = ensureSession();
    this._inspectorSession.on("Debugger.paused", this._onPaused.bind(this));
  }

  _addLogpoint(file, lineNumber) {
    return new Promise((resolve, reject) => {
      this._inspectorSession.post(
        "Debugger.setBreakpointByUrl",
        { url: file, lineNumber },
        (error, result) => {
          if (error) {
            reject(error);
          }

          resolve(result.breakpointId);
        }
      );
    });
  }

  _clearLogpoints() {
    return new Promise((resolve, reject) => {
      for (const breakpointId of this._logPoints.keys()) {
        this._inspectorSession.post("Debugger.removeBreakpoint", {
          breakpointId
        });
      }

      resolve();
    });
  }

  _removeLogpointByBreakpointId(breakpointId) {
    return new Promise((resolve, reject) => {
      this._inspectorSession.post(
        "Debugger.removeBreakpoint",
        { breakpointId },
        resolve
      );
    });
  }

  _onPaused({ params: { callFrames, hitBreakpoints, reason } }) {
    if (reason !== "other") {
      return;
    }

    const [breakpointId] = hitBreakpoints;
    if (this._logPoints.has(breakpointId)) {
      const { expressions } = this._logPoints.get(breakpointId);
      const [{ callFrameId }] = callFrames;

      expressions.forEach(expression => {
        this._inspectorSession.post(
          "Debugger.evaluateOnCallFrame",
          {
            callFrameId,
            expression,
            returnByValue: true
          },
          (error, response) => {
            if (!error) {
              const { exceptionDetails, result } = response;
              if (exceptionDetails) {
                super._writeLogpoint(exceptionDetails.exception.description);
              } else {
                super._writeLogpoint(result.value || result.description);
              }
            }
          }
        );
      });
    }
  }
};
