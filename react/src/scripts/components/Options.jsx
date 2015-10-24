'use strict';

import React from 'react'
import {Grid,Input} from 'react-bootstrap'

const Options = React.createClass({
    getInitialState(){
        return {maxRepaymentTerms: 120, maxRepaymentTerms_on: true}
    },
    componentWillMount(){
        this.base_options = {}
        if (typeof localStorage === 'object') {
            this.base_options = JSON.parse(localStorage.getItem('base_options'))
        }
        this.base_options = $.extend({maxRepaymentTerms: 120, maxRepaymentTerms_on: false}, this.base_options)
        this.setState(this.base_options)
    },
    maxRepaymentTermsUpdate(){
        var newState = {maxRepaymentTerms: this.refs.maxRepaymentTerms.value, maxRepaymentTerms_on: this.refs.maxRepaymentTerms_on.getChecked()}
        this.setState(newState)
        this.base_options = newState
        if (typeof localStorage === 'object')
            localStorage.setItem('base_options', JSON.stringify(this.base_options))
    },
    render() {
        return (
            <Grid>
                <h1>Options</h1>
                <p>Changing this will only impact the next time you visit the site.</p>
                <p>(Please expect these settings to change and be reset over time while in beta. Sorry for any inconvenience)</p>
                <Input type="checkbox" ref='maxRepaymentTerms_on' label={`Ignore Loans over ${this.state.maxRepaymentTerms} months for repayment term (stop downloading)`} checked={this.state.maxRepaymentTerms_on} onClick={this.maxRepaymentTermsUpdate} onChange={this.maxRepaymentTermsUpdate} />
                <input type="range" min={8} max={120} defaultValue={this.state.maxRepaymentTerms} ref='maxRepaymentTerms' onInput={this.maxRepaymentTermsUpdate} onChange={this.maxRepaymentTermsUpdate}/>
            </Grid>
        )
    }
})

export default Options;