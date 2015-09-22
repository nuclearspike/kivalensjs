'use strict';
import Reflux from 'reflux'

var loanActions = Reflux.createActions({
    "load": {children: ["progressed","completed","failed"]}
});

export {loanActions}