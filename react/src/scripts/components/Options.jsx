'use strict';

import React from 'react'
import {Grid,Input,Row,Col,Panel} from 'react-bootstrap'
import LinkedStateMixin from 'react-addons-linked-state-mixin'
import LocalStorageMixin from 'react-localstorage'

const Options = React.createClass({
    mixins: [LinkedStateMixin, LocalStorageMixin],
    getInitialState(){ return {maxRepaymentTerms: 120, maxRepaymentTerms_on: false} },
    render() {
        return (
            <Grid>
                <h1>Options</h1>
                <Col md={12}>
                    <Panel header='Notice' bsStyle="warning">
                        Changing these settings will <i>only</i> take effect the next time you visit the site/reload the page.
                    </Panel>
                    <p>(Please expect these settings to change and be reset over time while in beta. Sorry for any inconvenience)</p>
                    <Input type="checkbox" ref='maxRepaymentTerms_on' label={`Ignore Loans over ${this.state.maxRepaymentTerms} months for repayment term (stop downloading)`} checkedLink={this.linkState('maxRepaymentTerms_on')} />
                    <input type="range" min={8} max={120} valueLink={this.linkState('maxRepaymentTerms')} ref='maxRepaymentTerms'/>
                    <Row className="ample-padding-top">
                        <Input type='text' label='Kiva Lender ID' labelClassName='col-md-2' wrapperClassName='col-md-2' valueLink={this.linkState('kiva_lender_id')} />
                        <Col md={4}><a href="http://www.kiva.org/myLenderId" target="_blank">Click here if you don't know yours</a></Col>
                    </Row>
                </Col>
            </Grid>
        )
    }
})

export default Options;