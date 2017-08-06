const BREAK_EVENT_TYPE = 1;

module.exports = class DebugSession extends require("./BaseSession") {
  constructor(logPrefix = "") {
    super(logPrefix);

    this._debug = require("vm").runInDebugContext("Debug");
    this._debug.setListener((eventType, state, eventData) => {
      if (eventType !== BREAK_EVENT_TYPE) {
        return;
      }

      const [breakpoint] = eventData.breakPointsHit();
      const breakpointId = breakpoint.script_break_point().number();
      const logPointId = this._logPointIds.get(breakpointId);
      if (!logPointId) {
        return;
      }

      const { expressions } = this._logPoints.get(logPointId);
      expressions.forEach(expression => {
        const frame = state.frame(0);
        const result = frame.evaluate(expression);

        super._writeLogpoint(result.value());
      });
    });
  }

  _addLogpoint(file, lineNumber) {
    const breakpointId = this._debug.setScriptBreakPointByName(
      file,
      lineNumber
    );
    return Promise.resolve(breakpointId);
  }

  _clearLogpoints() {
    this._debug.clearAllBreakPoints();
    return Promise.resolve();
  }

  _removeLogpointByBreakpointId(breakpointId) {
    this._debug.clearBreakPoint(breakpointId);
    return Promise.resolve();
  }
};
