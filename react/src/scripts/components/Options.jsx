'use strict';

import React from 'react'
import {Grid,Input,Row,Col,Panel,Alert} from 'react-bootstrap'
import LinkedStateMixin from 'react-addons-linked-state-mixin'
import LocalStorageMixin from 'react-localstorage'

const Options = React.createClass({
    mixins: [LinkedStateMixin, LocalStorageMixin],
    getInitialState(){ return { maxRepaymentTerms: 120, maxRepaymentTerms_on: false } },
    render() {
        return (
            <Grid>
                <h1>Options</h1>
                <Col md={12}>
                    <Panel
                        header='Notice'
                        bsStyle="info">
                        <p>Changing these settings will <i>only</i> take effect the next time you visit the site/reload the page.</p>
                        <p>Expect these settings to change and your settings may be reset occasionally while in beta. Sorry for any inconvenience.</p>
                    </Panel>
                    <Panel header='Repayment Terms'>
                        <Input
                            type="checkbox"
                            label={`Ignore Loans over ${this.state.maxRepaymentTerms} month repayment terms (stop downloading)`}
                            checkedLink={this.linkState('maxRepaymentTerms_on')} />
                        <input
                            type="range"
                            min={8}
                            max={120}
                            valueLink={this.linkState('maxRepaymentTerms')}/>
                        After the initial load, if you keep the app open long enough, the rest of the loans will get loaded so you'll still need to use the
                        final repayment date criteria option.
                    </Panel>
                    <Panel header='Who are you?'>
                        <Row>
                            <Input
                            type='text'
                            label='Kiva Lender ID'
                            labelClassName='col-lg-2'
                            wrapperClassName='col-lg-4'
                            valueLink={this.linkState('kiva_lender_id')} />
                            <Col md={6}><a href="http://www.kiva.org/myLenderId" target="_blank">Click here if you don't know yours</a></Col>
                        </Row>
                        <Row>
                            <p className="pad-sides ample-padding-top">
                                This is used when filtering loans to be able to hide loans you've already loaned to. Also, expect more in the future
                                to help balance your portfolio.
                            </p>
                        </Row>
                    </Panel>
                </Col>
            </Grid>
        )
    }
})

export default Options;