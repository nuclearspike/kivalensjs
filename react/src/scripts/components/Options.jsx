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
                            <Input
                            type='text'
                            label='Kiva Lender ID'
                            labelClassName='col-lg-2'
                            wrapperClassName='col-lg-4'
                            valueLink={this.linkState('kiva_lender_id')} />
                            <Col md={6}><a href="http://www.kiva.org/myLenderId" target="_blank">Click here if you don't know yours</a></Col>
                        <Row>
                            <p className="pad-sides ample-padding-top">
                                This is used when filtering loans to be able to hide loans you've already loaned to. Also, expect more in the future
                                to help balance your portfolio.
                            </p>
                        </Row>
                    </Panel>
                    <Panel header='External Research'>
                        <Input
                            type="checkbox"
                            label={`Merge Atheist Team's MFI Research Data for Secular and Social ratings`}
                            checkedLink={this.linkState('mergeAtheistList')} />
                        <p>
                            KivaLens server pulls the <a href="http://www.kiva.org/team/atheists" target="_blank">Atheist Team</a>'s
                            MFI List found in a <a href="http://docs.google.com/spreadsheets/d/1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0/export?gid=1&format=csv" target="_blank">Google Doc</a> once
                            a day and merges some of the data which allows you to search using their Secular (1-4)
                            and Social ratings (1-4) where a 1 represents a low score, so a 1 in the Secular Score
                            means that it is religion based. When activated, this will add 2 new sliders to the Partner
                            tab for Criteria and a section displaying and explaining the ratings to the Partner tab
                            of the loan. If a partner is not present in the MFI Research Data, it will pass by default.
                        </p>
                    </Panel>
                </Col>
            </Grid>
        )
    }
})

export default Options;