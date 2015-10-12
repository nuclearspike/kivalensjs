'use strict';

import Reflux from 'reflux'

var a = {loans: null, criteria: null, partners: null};

a.loans = Reflux.createActions({
    "load": {children: ["progressed", "completed", "failed"]},
    "filter": {children: ["completed"]},
    "detail": {children: ["completed"]},
    "basket": {children: ["add", "remove", "changed","batchAdd","clear"]},
    "lender": {children: ["completed"]}
});

a.partners = Reflux.createActions({
    "load": {children: ["completed", "failed"]},
    "filter": {children: ["completed"]},
    "single": {children: ["completed"]}
});

a.criteria  = Reflux.createActions([
    "change"
])

a.criteria.getLast = Reflux.createAction({
    children: ["completed"]
});

export default a