'use strict';
import Reflux from 'reflux'

var loanActions = Reflux.createActions({
    "load": {children: ["progressed","completed","failed"]}
});

var criteriaActions = Reflux.createActions([
    "change"
])

criteriaActions.getLast = Reflux.createAction({
    children: ["completed"]
});

export {loanActions, criteriaActions}