import React from 'react/addons';
import Reflux from 'reflux'
import a from '../actions'
import s from '../stores/'
import {Grid,Row,Col,Input,Button,Tabs,Tab,ProgressBar} from 'react-bootstrap';

var timeoutHandle=0
const CriteriaTabs = React.createClass({
    mixins: [Reflux.ListenerMixin, React.addons.LinkedStateMixin],
    getInitialState: function () {
        return { hasDetails: false, progress: 0, progress_label: 'Preparing to fetch extra loan details (schedules, details, etc)' }
    },
    componentDidMount: function () {
        this.setState(s.criteria.syncGetLast) //todo: can this be criteria.use ?
        this.setState({hasDetails: s.loans.syncHasAllDetails()})
        this.listenTo(a.loans.details.completed, ()=>{this.setState({hasDetails: true})})
        this.listenTo(a.loans.details.progressed, (progress)=>{
            if (progress.label) {
                this.setState({progress: progress.percentage, progress_label: progress.label})
            }
        })
    },
    criteriaChanged: function(){
        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(a.criteria.change.bind(this, this.state), 150)
    },
    clearCriteria: function(){
        this.replaceState({})
        a.criteria.change({})
    },
    render: function () {
        var hasD = (<div className='full-width'><ProgressBar style={{width:"300px"}} active now={this.state.progress} /> {this.state.progress_label}</div>)
        if (this.state.hasDetails)
            hasD = "Has Details!!"

        return (<div>
            <Tabs defaultActiveKey={1}>
                <Tab eventKey={1} title="Borrower">
                    {hasD}
                    <Row>
                        <Input type='text' label='Use' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('use')} onKeyUp={this.criteriaChanged} />
                    </Row>
                    <Row>
                        <Input type='text' label='Name' labelClassName='col-md-2' wrapperClassName='col-md-6' valueLink={this.linkState('name')} onKeyUp={this.criteriaChanged} />
                    </Row>
                    <Row>
                        <Input type='text' label='Country' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('country')} onKeyUp={this.criteriaChanged} />
                    </Row>
                    <Row>
                        <Input type='text' label='Sector' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('sector')} onKeyUp={this.criteriaChanged} />
                    </Row>
                    <Row>
                        <Input type='text' label='Activity' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('activity')} onKeyUp={this.criteriaChanged} />
                    </Row>
                </Tab>
                <Tab eventKey={2} title="Partner">
                    Always Exclude list of IDs.
                </Tab>
                <Tab eventKey={3} title="Your Portfolio">
                    <Row>
                        <Input type='text' label='Kiva Lender ID' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('lender_id')} onKeyUp={this.criteriaChanged} />
                    </Row>
                </Tab>
            </Tabs>
            <Button onClick={this.clearCriteria}>Clear</Button>
            </div>
        );
    }
})

export default CriteriaTabs