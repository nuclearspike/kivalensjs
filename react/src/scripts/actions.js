'use strict';
import Reflux from 'reflux'

//var loanActions = Reflux.createActions(['search','single','batch','progress']);

var loanActions = Reflux.createActions({
    "load": {children: ["progressed","completed","failed"]}
});

export {loanActions}