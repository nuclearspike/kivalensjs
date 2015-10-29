'use strict';

import Reflux from 'reflux'

var a = {loans: null, criteria: null, partners: null, notifications: null, utils: null};

a.loans = Reflux.createActions({
    "load": {children: ["progressed", "completed", "failed"]},
    "filter": {children: ["completed"]},
    "detail": {children: ["completed"]},
    "basket": {children: ["add", "remove", "changed","batchAdd","clear"]},
    "lender": {children: ["completed"]},
    "backgroundResync":{ children: ["removed","added","updated"]}
});

//used anymore?
a.partners = Reflux.createActions({
    "load": {children: ["completed", "failed"]},
    "filter": {children: ["completed"]},
    "single": {children: ["completed"]}
});

a.criteria  = Reflux.createActions([
    "change","lenderLoansEvent","savedSearchListChanged","switchToSaved","reload","startFresh"
])
a.criteria.getLast = Reflux.createAction({
    children: ["completed"]
});

a.notifications = Reflux.createAction({
    children: ["show"]
})

a.utils = Reflux.createAction({
    children: ["prompt"]
})

window.kl_actions = a
export default a