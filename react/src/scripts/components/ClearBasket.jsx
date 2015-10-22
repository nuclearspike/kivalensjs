import React from 'react';
import a from '../actions'

//should this allow the user to choose to clear the basket?
const ClearBasket = React.createClass({
    componentDidMount: function () {
        a.loans.basket.clear()
        window.rga.event({category: 'basket', action: 'basket:clear-from-return-url'})
        location.replace(`http://${location.host}${location.pathname}#/search`)
    },
    render: function () {return (<div></div>)}
})

export default ClearBasket