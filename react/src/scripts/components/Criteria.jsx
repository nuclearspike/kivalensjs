import React from 'react/addons';
import Reflux from 'reflux'
import {criteriaActions, loanActions} from '../actions'
import {criteriaStore} from '../stores/criteriaStore'
import {Grid,Row,Col,Input,Button,Tabs,Tab} from 'react-bootstrap';
import {ChartDistribution} from '.'

const Criteria = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState: function() {
        console.log("Criteria.getInitialState()")
        return {}
    },
    componentDidMount: function() {
        console.log("Criteria.componentDidMount()")
        this.setState(criteriaStore.syncGetLast)
    },
    criteriaChanged: function() {
        criteriaActions.change(this.getRefs())
    },
    clearCriteria: function(){
        this.replaceState({})
        criteriaActions.change({})
    },
    setRefs: function(state){
        this.setState(state)
    },
    getRefs: function(){
        return {
            use: this.refs.use.getValue(),
            name: this.refs.name.getValue(),
            country: this.refs.country.getValue(),
            sector: this.refs.sector.getValue(),
            activity: this.refs.activity.getValue(),
            lender_id: this.refs.lender_id.getValue()
        }
    },
    render: function() {
        console.log("Criteria.render()")
        return (
            <div>
                <h1>Criteria</h1>
                <ChartDistribution/>
                <Tabs defaultActiveKey={1}>
                    <Tab eventKey={1} title="General">
                        <Row>
                            <Input type='text' label='Use' labelClassName='col-md-2' wrapperClassName='col-md-6' ref='use' value={this.state.use} onKeyUp={this.criteriaChanged} />
                        </Row>
                        <Row>
                            <Input type='text' label='Name' labelClassName='col-md-2' wrapperClassName='col-md-6' ref='name' value={this.state.name} onKeyUp={this.criteriaChanged} />
                        </Row>
                        <Row>
                            <Input type='text' label='Country' labelClassName='col-md-2' wrapperClassName='col-md-6' ref='country' value={this.state.country} onKeyUp={this.criteriaChanged} />
                        </Row>
                        <Row>
                            <Input type='text' label='Sector' labelClassName='col-md-2' wrapperClassName='col-md-6' ref='sector' value={this.state.sector} onKeyUp={this.criteriaChanged} />
                        </Row>
                        <Row>
                            <Input type='text' label='Activity' labelClassName='col-md-2' wrapperClassName='col-md-6' ref='activity' value={this.state.activity} onKeyUp={this.criteriaChanged} />
                        </Row>
                        <Button onClick={this.clearCriteria}>Clear</Button>
                    </Tab>
                    <Tab eventKey={2} title="Personal">
                        <Row>
                            <Input type='text' label='Kiva Lender ID' labelClassName='col-md-2' wrapperClassName='col-md-6' ref='lender_id' value={this.state.lender_id} onKeyUp={this.criteriaChanged} />
                        </Row>
                    </Tab>
                </Tabs>
            </div>
        );
    }
})

export default Criteria